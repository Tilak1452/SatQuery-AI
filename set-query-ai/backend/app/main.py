"""
Set Query AI — FastAPI application.

Routes:
    GET  /api/config           → Public config (max AOI area)
    POST /api/aoi              → Submit AOI, get job_id
    WS   /ws/process/{job_id}  → Stream processing status + results
"""

from __future__ import annotations

import asyncio
import json
import math
import uuid
from contextlib import asynccontextmanager
from typing import Any

import ee
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil
import cv2
import numpy as np
import rasterio

from .config import settings
from .gee_client import initialize_gee, get_ee
from .schemas import (
    AoiRequest,
    AoiResponse,
    ConfigResponse,
    StatusMessage,
    ResultMessage,
    ErrorMessage,
)
from .pipelines.optical import run_optical_pipeline
from .pipelines.sar import run_sar_pipeline


# ---------------------------------------------------------------------------
# PROTOTYPE-ONLY: In-memory job store.
# ⚠️  This dict is ephemeral — it loses all state on server restart and
#     does NOT support multi-worker deployments (e.g. gunicorn with workers>1).
#     Future iteration MUST migrate to Redis or PostgreSQL.
# ---------------------------------------------------------------------------
jobs: dict[str, dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Area calculation utility (no GEE call needed)
# ---------------------------------------------------------------------------

def _compute_geodesic_area_km2(geometry: dict) -> float:
    """
    Approximate the area of a GeoJSON polygon in km² using the
    Shoelace formula on WGS-84 coordinates with latitude correction.
    Accurate enough for AOI validation (not for scientific use).
    """
    coords = geometry["coordinates"]
    # Handle MultiPolygon by summing areas
    if geometry["type"] == "MultiPolygon":
        return sum(_ring_area_km2(ring[0]) for ring in coords)
    # Single Polygon — use outer ring (index 0)
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

    # Convert deg² → km² using mean latitude of the ring
    mean_lat = sum(p[1] for p in ring) / n
    lat_rad = math.radians(mean_lat)

    # 1 degree latitude ≈ 111.32 km, 1 degree longitude ≈ 111.32 * cos(lat) km
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
        print("OK: Google Earth Engine initialized successfully")
    except Exception as e:
        # Gracefully handle ee.Initialize() failure on startup
        print(f"FATAL ERROR: GEE initialization failed: {e}")
        print("  The app will start, but processing requests will fail.")
        print("  Please check your GEE_SERVICE_ACCOUNT_* env vars.")
    yield
    # Cleanup
    jobs.clear()


app = FastAPI(
    title="Set Query AI",
    description="AOI-based satellite imagery retrieval (Sentinel-2 + Sentinel-1)",
    version="0.1.0",
    lifespan=lifespan,
)

# Mount the input_images directory to serve uploaded images
app.mount("/images", StaticFiles(directory="input_images"), name="images")

# CORS — allow frontend dev server (supports localhost and 127.0.0.1 on any port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    """
    Public configuration endpoint — single source of truth.
    Frontend fetches this on mount to know the max AOI area.
    """
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
    # Server-side AOI area validation
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

    # Store job params for WebSocket pickup
    jobs[job_id] = {
        "geometry": request.geometry,
        "date_start": request.effective_date_start(),
        "date_end": request.effective_date_end(),
        "area_km2": area_km2,
    }

    return AoiResponse(job_id=job_id)


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
    
    # Save original file
    with open(original_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    bounds = []
    
    if ext in (".tif", ".tiff", ".geotiff"):
        # Process GeoTIFF using rasterio and OpenCV to preserve CRS
        try:
            with rasterio.open(original_path) as src:
                # Extract bounds if available (transform to WSG84 if needed, 
                # but for prototype we just read the raw bounding box)
                if src.bounds:
                    bounds = [
                        [src.bounds.left, src.bounds.bottom],
                        [src.bounds.right, src.bounds.top]
                    ]
                
                # Read image data
                img = src.read()
                
                # Simple normalization to 8-bit for display
                if img.shape[0] >= 3:
                    # Select first 3 bands (RGB) and transpose to HWC for OpenCV
                    img = img[:3, :, :].transpose((1, 2, 0))
                    
                    # Normalize to 0-255
                    img_min, img_max = np.percentile(img, (2, 98))
                    img = np.clip((img - img_min) / (img_max - img_min), 0, 1)
                    img = (img * 255).astype(np.uint8)
                    
                    # OpenCV expects BGR
                    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
                    cv2.imwrite(thumb_path, img)
                else:
                    # Grayscale
                    img = img[0]
                    img_min, img_max = np.percentile(img, (2, 98))
                    img = np.clip((img - img_min) / (img_max - img_min), 0, 1)
                    img = (img * 255).astype(np.uint8)
                    cv2.imwrite(thumb_path, img)
                    
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process GeoTIFF: {str(e)}")
    else:
        # If it's already a PNG/JPG, just use it as the thumbnail
        if original_path != thumb_path:
            shutil.copyfile(original_path, thumb_path)
        
    # Build full URL for the thumbnail
    # Note: In a production app, use the actual request base URL
    base_url = settings.api_base_url if hasattr(settings, 'api_base_url') else "http://localhost:8000"
    optical_url = f"{base_url}/images/{thumb_filename}"
    
    return ResultMessage(
        optical_url=optical_url,
        sar_url="", # Empty since it's a custom upload
        aoi_bounds=bounds
    )



# ---------------------------------------------------------------------------
# Helper: Exponential Backoff for GEE
# ---------------------------------------------------------------------------
async def run_with_backoff(func, *args, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await asyncio.to_thread(func, *args)
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            await asyncio.sleep(2 ** attempt)# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/process/{job_id}")
async def process_aoi(websocket: WebSocket, job_id: str):
    """
    Stream processing status for a submitted AOI job.
    Runs optical pipeline first, extracts acquisition date,
    then chains the SAR pipeline to ±7 days of that date.
    """
    await websocket.accept()

    # Look up job
    job = jobs.get(job_id)
    if not job:
        await websocket.send_json(
            ErrorMessage(message="Invalid or expired job ID.").model_dump()
        )
        await websocket.close()
        return

    try:
        # Helper to send status + yield control to the event loop
        async def send_status(msg: str):
            await websocket.send_json(
                StatusMessage(message=msg).model_dump()
            )

        await send_status("Connecting to Earth Engine...")

        # Ensure GEE client is initialized
        try:
            get_ee()
        except RuntimeError as e:
            await websocket.send_json(
                ErrorMessage(message=str(e)).model_dump()
            )
            return

        # Build GEE geometry
        geometry = ee.Geometry(job["geometry"])

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

        # --- Optical pipeline (runs first) ---
        await send_status("Retrieving optical imagery...")
        try:
            optical_result = await run_with_backoff(
                run_optical_pipeline,
                geometry,
                job["date_start"],
                job["date_end"],
                sync_send_status,
            )
        except Exception as exc:
            optical_error = str(exc)
            print(f"Optical pipeline warning: {optical_error}")
            await send_status(f"Optical unavailable ({optical_error[:80]}...). Checking SAR...")

        # --- SAR pipeline ---
        await send_status(
            "Retrieving SAR imagery..."
        )
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
            )
        except Exception as exc:
            sar_error = str(exc)
            print(f"SAR pipeline warning: {sar_error}")

        # If BOTH failed, raise error to notify client
        if not optical_result and not sar_result:
            raise ValueError(
                optical_error or sar_error or "Both optical and SAR image generation failed for this location."
            )

        # --- Send final result ---
        await send_status("Preparing results...")

        # Compute bounding box from the geometry bounds
        bounds = geometry.bounds().coordinates().getInfo()
        coords = bounds[0]  # outer ring of the bounding box
        min_lon = min(c[0] for c in coords)
        min_lat = min(c[1] for c in coords)
        max_lon = max(c[0] for c in coords)
        max_lat = max(c[1] for c in coords)

        result = ResultMessage(
            optical_url=optical_result["thumb_url"] if optical_result else None,
            sar_url=sar_result["thumb_url"] if sar_result else None,
            optical_download_url=optical_result.get("download_url") if optical_result else None,
            sar_download_url=sar_result.get("download_url") if sar_result else None,
            optical_error=optical_error,
            sar_error=sar_error,
            aoi_bounds=[[min_lon, min_lat], [max_lon, max_lat]],
        )
        await websocket.send_json(result.model_dump())

    except ValueError as e:
        # Pipeline-level validation errors (no images found, etc.)
        await websocket.send_json(
            ErrorMessage(message=str(e)).model_dump()
        )
    except Exception as e:
        # Unexpected errors
        await websocket.send_json(
            ErrorMessage(
                message=f"Processing failed: {str(e)}"
            ).model_dump()
        )
    finally:
        # PROTOTYPE-ONLY: Evict completed job to prevent memory leak
        jobs.pop(job_id, None)
        try:
            await websocket.close()
        except Exception:
            pass  # Connection may already be closed
