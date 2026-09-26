"""
Set Query AI — FastAPI application.

Routes:
    GET  /api/config                     → Public config (max AOI area)
    POST /api/aoi                        → Submit AOI, get job_id
    GET  /api/jobs/{job_id}/download-zip → Download packaged time-series dataset ZIP
    WS   /ws/process/{job_id}            → Stream processing status, preview results, and ZIP progress
"""

from __future__ import annotations

import asyncio
import json
import math
import os
import shutil
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
import functools
from typing import Any

import cv2
import ee
import numpy as np
import rasterio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .dataset_packager import package_dataset_background, zip_registry
from .gee_client import initialize_gee, get_ee
from .schemas import (
    AoiRequest,
    AoiResponse,
    ConfigResponse,
    StatusMessage,
    ResultMessage,
    ErrorMessage,
    ZipProgressMessage,
)
from .pipelines.optical import run_optical_pipeline
from .pipelines.sar import run_sar_pipeline


# ---------------------------------------------------------------------------
# In-memory job store.
# ---------------------------------------------------------------------------
jobs: dict[str, dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Area calculation utility (no GEE call needed)
# ---------------------------------------------------------------------------

def _compute_geodesic_area_km2(geometry: dict) -> float:
    """
    Approximate the area of a GeoJSON polygon in km² using the
    Shoelace formula on WGS-84 coordinates with latitude correction.
    """
    coords = geometry["coordinates"]
    if geometry["type"] == "MultiPolygon":
        return sum(_ring_area_km2(ring[0]) for ring in coords)
    return _ring_area_km2(coords[0])


def _ring_area_km2(ring: list[list[float]]) -> float:
    """Compute area of a single ring of [lon, lat] pairs in km²."""
    n = len(ring)
    if n < 3:
        return 0.0

    area_deg2 = 0.0
    for i in range(n):
        j = (i + 1) % n
        area_deg2 += ring[i][0] * ring[j][1]
        area_deg2 -= ring[j][0] * ring[i][1]
    area_deg2 = abs(area_deg2) / 2.0

    mean_lat = sum(p[1] for p in ring) / n
    lat_rad = math.radians(mean_lat)

    km_per_deg_lat = 111.32
    km_per_deg_lon = 111.32 * math.cos(lat_rad)

    return area_deg2 * km_per_deg_lat * km_per_deg_lon


# ---------------------------------------------------------------------------
# Application lifespan — init GEE on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize GEE on startup; cleanup on shutdown."""
    try:
        initialize_gee()
        print("Earth Engine initialized successfully on startup.")
    except Exception as e:
        print(f"Warning: Earth Engine startup initialization failed: {e}")
        print("Will attempt re-initialization on first request.")
    yield


# ---------------------------------------------------------------------------
# FastAPI app setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SatQuery AI",
    description="Interactive satellite imagery retrieval & dual-modal time-series engine",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS configuration — support Vercel domains, localhost, and custom frontend_origin
cors_origins = [
    origin.strip()
    for origin in settings.frontend_origin.split(",")
    if origin.strip()
]
for local in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]:
    if local not in cors_origins:
        cors_origins.append(local)

if "*" in cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount input_images for serving uploaded/processed files
os.makedirs("input_images", exist_ok=True)
app.mount("/images", StaticFiles(directory="input_images"), name="images")


# ---------------------------------------------------------------------------
# Healthcheck Endpoint (For Uptime monitoring & zero-downtime pingers)
# ---------------------------------------------------------------------------

@app.get("/healthz")
async def health_check():
    """Lightweight healthcheck for uptime monitoring and zero-downtime pingers."""
    return {"status": "ok", "service": "SatQuery AI", "version": "0.2.0"}


# ---------------------------------------------------------------------------
# Helper: Retry async runner with exponential backoff
# ---------------------------------------------------------------------------

async def run_with_backoff(
    func,
    *args,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    **kwargs
):
    """Runs a blocking GEE function in an executor with retries for transient HTTP errors."""
    loop = asyncio.get_running_loop()
    delay = initial_delay
    last_exc = None

    for attempt in range(max_retries):
        try:
            call_func = functools.partial(func, *args, **kwargs)
            return await loop.run_in_executor(None, call_func)
        except Exception as exc:
            last_exc = exc
            err_str = str(exc).lower()
            transient_signals = [
                "connection reset",
                "timeout",
                "503",
                "504",
                "internal error",
                "quota exceeded",
                "rate limit",
            ]
            if any(signal in err_str for signal in transient_signals) and attempt < max_retries - 1:
                print(f"[GEE Retry {attempt+1}/{max_retries}] Transient error: {exc}. Retrying in {delay:.1f}s...")
                await asyncio.sleep(delay)
                delay *= 2.0
            else:
                raise last_exc


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    """Returns max and min allowed AOI areas in km²."""
    return ConfigResponse(
        max_aoi_area_km2=settings.max_aoi_area_km2,
        min_aoi_area_km2=settings.min_aoi_area_km2,
    )


@app.post("/api/aoi", response_model=AoiResponse)
async def submit_aoi(request: AoiRequest):
    """
    Submit an AOI for processing.
    Validates area, stores job params, returns job_id.
    """
    area_km2 = _compute_geodesic_area_km2(request.geometry)
    if area_km2 > settings.max_aoi_area_km2:
        raise HTTPException(
            status_code=422,
            detail=(
                f"AOI area ({area_km2:.1f} km²) exceeds the maximum "
                f"allowed area ({settings.max_aoi_area_km2} km²). "
                f"Please draw a smaller region."
            ),
        )

    if area_km2 < settings.min_aoi_area_km2:
        raise HTTPException(
            status_code=422,
            detail=(
                f"AOI area ({area_km2:.2f} km²) is below the minimum "
                f"required area ({settings.min_aoi_area_km2} km²). "
                f"Sentinel's 10m native resolution cannot render detailed images for areas this small."
            ),
        )

    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        "geometry": request.geometry,
        "date_start": request.effective_date_start(),
        "date_end": request.effective_date_end(),
        "mode": request.mode,
        "max_scenes": request.max_scenes or 10,
        "area_km2": area_km2,
    }

    return AoiResponse(job_id=job_id)


@app.get("/api/jobs/{job_id}/download-zip")
async def download_job_zip(job_id: str):
    """
    Download the packaged GeoTIFF time-series dataset as a single ZIP archive.
    """
    entry = zip_registry.get(job_id)
    if not entry or not os.path.exists(entry["file_path"]):
        raise HTTPException(
            status_code=404,
            detail="Dataset archive not found or is still generating in the background."
        )
    return FileResponse(
        path=entry["file_path"],
        filename=entry["filename"],
        media_type="application/zip",
    )


@app.post("/api/upload")
async def upload_custom_image(file: UploadFile = File(...)):
    """
    Handle custom image upload. 
    Validates format, converts GeoTIFFs to displayable PNGs, and saves them.
    """
    valid_extensions = (".tif", ".tiff", ".geotiff", ".png", ".jpg", ".jpeg")
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in valid_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(valid_extensions)}"
        )
        
    os.makedirs("input_images", exist_ok=True)
    file_id = str(uuid.uuid4())
    original_path = f"input_images/{file_id}{ext}"
    thumb_filename = f"{file_id}.png"
    thumb_path = f"input_images/{thumb_filename}"
    
    with open(original_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    bounds = []
    
    if ext in (".tif", ".tiff", ".geotiff"):
        try:
            with rasterio.open(original_path) as src:
                if src.bounds:
                    bounds = [
                        [src.bounds.left, src.bounds.bottom],
                        [src.bounds.right, src.bounds.top]
                    ]
                img = src.read()
                if img.shape[0] >= 3:
                    img = img[:3, :, :].transpose((1, 2, 0))
                    img_min, img_max = np.percentile(img, (2, 98))
                    img = np.clip((img - img_min) / (img_max - img_min), 0, 1)
                    img = (img * 255).astype(np.uint8)
                    img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
                    cv2.imwrite(thumb_path, img_bgr)
                elif img.shape[0] == 1:
                    img = img[0, :, :]
                    img_min, img_max = np.percentile(img, (2, 98))
                    img = np.clip((img - img_min) / (img_max - img_min), 0, 1)
                    img = (img * 255).astype(np.uint8)
                    cv2.imwrite(thumb_path, img)
                else:
                    cv2.imwrite(thumb_path, (img[0] * 255).astype(np.uint8))
        except Exception as e:
            print(f"Rasterio error: {e}")
            shutil.copyfile("dummy.png", thumb_path)
    else:
        shutil.copyfile(original_path, thumb_path)
        
    base_url = f"http://localhost:8000/images/{thumb_filename}"
    
    return {
        "type": "result",
        "optical_url": base_url,
        "sar_url": None,
        "optical_download_url": base_url,
        "sar_download_url": None,
        "optical_error": None,
        "sar_error": None,
        "aoi_bounds": bounds if bounds else [[0, 0], [0, 0]],
    }


# ---------------------------------------------------------------------------
# WebSocket Endpoint: Stream processing status, previews, and ZIP progress
# ---------------------------------------------------------------------------

@app.websocket("/ws/process/{job_id}")
async def process_aoi(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for end-to-end pipeline execution.
    1. Streams processing status updates
    2. Sends immediate optical & SAR preview results
    3. Asynchronously packages all scenes into a background ZIP
    4. Streams ZIP progress until ready
    """
    await websocket.accept()

    job = jobs.get(job_id)
    if not job:
        await websocket.send_json(
            ErrorMessage(message="Invalid or expired job ID.").model_dump()
        )
        await websocket.close()
        return

    try:
        async def send_status(msg: str):
            await websocket.send_json(
                StatusMessage(message=msg).model_dump()
            )

        async def send_zip_progress(progress_msg: ZipProgressMessage):
            await websocket.send_json(progress_msg.model_dump())

        await send_status("Connecting to Earth Engine...")

        try:
            get_ee()
        except RuntimeError as e:
            await websocket.send_json(
                ErrorMessage(message=str(e)).model_dump()
            )
            return

        geometry = ee.Geometry(job["geometry"])
        mode = job.get("mode", "composite")
        max_scenes = job.get("max_scenes", 10)

        loop = asyncio.get_running_loop()

        def sync_send_status(msg: str):
            try:
                future = asyncio.run_coroutine_threadsafe(send_status(msg), loop)
                future.result(timeout=5)
            except Exception as exc:
                print(f"Status update warning: {exc}")

        optical_result = None
        optical_error = None
        sar_result = None
        sar_error = None

        # --- 1. Optical pipeline ---
        await send_status("Retrieving Sentinel-2 optical imagery...")
        try:
            optical_result = await run_with_backoff(
                run_optical_pipeline,
                geometry,
                job["date_start"],
                job["date_end"],
                sync_send_status,
                mode=mode,
                max_scenes=max_scenes,
            )
        except Exception as exc:
            optical_error = str(exc)
            print(f"Optical pipeline warning: {optical_error}")
            await send_status(f"Optical unavailable ({optical_error[:80]}...). Checking SAR...")

        # --- 2. SAR pipeline ---
        await send_status("Retrieving Sentinel-1 SAR imagery...")
        try:
            if optical_result and "acquisition_date_ms" in optical_result:
                sar_ref_ms = optical_result["acquisition_date_ms"]
            else:
                end_dt = datetime.combine(job["date_end"], datetime.min.time())
                sar_ref_ms = int(end_dt.timestamp() * 1000)

            sar_result = await run_with_backoff(
                run_sar_pipeline,
                geometry,
                sar_ref_ms,
                sync_send_status,
                mode=mode,
                date_start=job["date_start"],
                date_end=job["date_end"],
                max_scenes=max_scenes,
            )
        except Exception as exc:
            sar_error = str(exc)
            print(f"SAR pipeline warning: {sar_error}")

        if not optical_result and not sar_result:
            raise ValueError(
                optical_error or sar_error or "Both optical and SAR image generation failed for this location."
            )

        # --- 3. Compute AOI bounds ---
        bounds = geometry.bounds().coordinates().getInfo()
        coords = bounds[0]
        min_lon = min(c[0] for c in coords)
        min_lat = min(c[1] for c in coords)
        max_lon = max(c[0] for c in coords)
        max_lat = max(c[1] for c in coords)

        # Collect scenes metadata
        scenes_meta: list[dict[str, Any]] = []
        if optical_result and "scenes" in optical_result:
            scenes_meta.extend(optical_result["scenes"])
        if sar_result and "scenes" in sar_result:
            scenes_meta.extend(sar_result["scenes"])

        total_scenes_count = len(scenes_meta) if scenes_meta else (2 if (optical_result and sar_result) else 1)

        # --- 4. Send immediate preview results to UI ---
        await send_status("Rendering immediate high-resolution preview...")

        result = ResultMessage(
            optical_url=optical_result["thumb_url"] if optical_result else None,
            sar_url=sar_result["thumb_url"] if sar_result else None,
            optical_download_url=optical_result.get("download_url") if optical_result else None,
            sar_download_url=sar_result.get("download_url") if sar_result else None,
            optical_error=optical_error,
            sar_error=sar_error,
            aoi_bounds=[[min_lon, min_lat], [max_lon, max_lat]],
            mode=mode,
            optical_timestamp=optical_result.get("timestamp_utc") if optical_result else None,
            sar_timestamp=sar_result.get("timestamp_utc") if sar_result else None,
            zip_status="processing",
            total_scenes=total_scenes_count,
            scenes=scenes_meta,
        )
        await websocket.send_json(result.model_dump())

        # --- 5. Background Harvest & Package into ZIP ---
        # User sees preview immediately; backend now packs the full GeoTIFF dataset in background
        await package_dataset_background(
            job_id=job_id,
            geometry=geometry,
            optical_res=optical_result,
            sar_res=sar_result,
            mode=mode,
            send_progress=send_zip_progress,
        )

        # Keep connection open briefly so client receives final packet before close
        await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        print(f"WebSocket client disconnected for job {job_id}")
    except ValueError as e:
        await websocket.send_json(
            ErrorMessage(message=str(e)).model_dump()
        )
    except Exception as e:
        await websocket.send_json(
            ErrorMessage(message=f"Processing failed: {str(e)}").model_dump()
        )
    finally:
        jobs.pop(job_id, None)
        try:
            await websocket.close()
        except Exception:
            pass
