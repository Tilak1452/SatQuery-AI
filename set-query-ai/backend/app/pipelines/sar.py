"""
Sentinel-1 SAR backscatter pipeline.

Queries COPERNICUS/S1_GRD:
- In "composite" mode: temporally chained to ±7 days of optical acquisition,
  producing a speckle-reduced median composite.
- In "timeseries" mode: provides instant preview of nearest pass + metadata
  for all available SAR passes in the window.

All downloads are named with precise UTC acquisition timestamps:
Format: SatQuery_S1_SAR_VV_YYYYMMDD_THHMMSSZ.tif
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import ee

from . import compute_thumb_params, format_gee_timestamp


SAR_TEMPORAL_WINDOW_DAYS = 7


def run_sar_pipeline(
    geometry: ee.Geometry,
    optical_acquisition_date_ms: int,
    send_status: Callable[[str], Any],
    mode: str = "composite",
    date_start: Any = None,
    date_end: Any = None,
    max_scenes: int = 10,
) -> dict:
    """
    Execute the Sentinel-1 SAR pipeline.
    """
    optical_dt = datetime.fromtimestamp(optical_acquisition_date_ms / 1000, tz=timezone.utc)

    if mode == "timeseries" and date_start and date_end:
        sar_start_str = str(date_start)
        sar_end_str = str(date_end)
        send_status(f"Querying Sentinel-1 SAR time-series ({sar_start_str} to {sar_end_str})...")
    else:
        sar_start = optical_dt - timedelta(days=SAR_TEMPORAL_WINDOW_DAYS)
        sar_end = optical_dt + timedelta(days=SAR_TEMPORAL_WINDOW_DAYS)
        sar_start_str = sar_start.strftime("%Y-%m-%d")
        sar_end_str = sar_end.strftime("%Y-%m-%d")
        send_status(
            f"Filtering Sentinel-1 SAR imagery "
            f"(±{SAR_TEMPORAL_WINDOW_DAYS}d of optical: {sar_start_str} to {sar_end_str})..."
        )

    collection = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(geometry)
        .filterDate(sar_start_str, sar_end_str)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
    )

    count = collection.size().getInfo()
    if count == 0:
        # Fallback to wider 30-day window around optical date
        fallback_start = optical_dt - timedelta(days=30)
        fallback_end = optical_dt + timedelta(days=30)
        collection = (
            ee.ImageCollection("COPERNICUS/S1_GRD")
            .filterBounds(geometry)
            .filterDate(fallback_start.strftime("%Y-%m-%d"), fallback_end.strftime("%Y-%m-%d"))
            .filter(ee.Filter.eq("instrumentMode", "IW"))
            .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        )
        count = collection.size().getInfo()

    if count == 0:
        raise ValueError(
            f"No Sentinel-1 SAR images found for the selected AOI near "
            f"({optical_dt.strftime('%Y-%m-%d')}). Try expanding the date range."
        )

    # Closest image in time to the optical date
    first_image = ee.Image(collection.first())
    sar_time_ms = first_image.get("system:time_start").getInfo()
    sar_iso, sar_slug = format_gee_timestamp(sar_time_ms)

    scenes_metadata: list[dict[str, Any]] = []

    if mode == "timeseries":
        send_status(f"Harvesting metadata for top {min(count, max_scenes)} SAR passes...")
        sar_scenes = collection.limit(max_scenes)
        features = sar_scenes.getInfo().get("features", [])
        for feat in features:
            props = feat.get("properties", {})
            t_ms = props.get("system:time_start")
            t_iso, t_slug = format_gee_timestamp(t_ms)
            scenes_metadata.append({
                "id": feat.get("id"),
                "sensor": "Sentinel-1",
                "modality": "SAR VV",
                "time_ms": t_ms,
                "timestamp_utc": t_iso,
                "slug": t_slug,
                "filename": f"SatQuery_S1_SAR_VV_{t_slug}.tif",
            })

    thumb_region = geometry.bounds()
    bounds_info = thumb_region.coordinates().getInfo()
    thumb_params = compute_thumb_params(bounds_info[0], native_scale=10)

    if mode == "timeseries":
        # Primary preview: use closest single image with spatial speckle reduction
        send_status(f"Selected SAR pass ({sar_iso}) with speckle reduction for instant preview...")
        vv = first_image.select("VV").focalMedian(radius=15, kernelType="circle", units="meters")
    else:
        send_status(f"Found {count} Sentinel-1 images. Building SAR composite...")
        composite = collection.median()
        vv = composite.select("VV")

    sar_vis = vv.unmask(-25).clip(thumb_region).visualize(
        min=-22,
        max=1,
    )

    send_status("Generating SAR preview...")

    thumb_url = sar_vis.getThumbURL({
        "region": thumb_region,
        "format": "png",
        **thumb_params,
    })

    download_name = f"SatQuery_S1_SAR_VV_{sar_slug}"
    download_url = sar_vis.getDownloadURL({
        "name": download_name,
        "region": geometry,
        "scale": 10,
        "format": "GEO_TIFF",
    })

    return {
        "thumb_url": thumb_url,
        "download_url": download_url,
        "timestamp_utc": sar_iso,
        "filename_slug": sar_slug,
        "scenes": scenes_metadata,
    }
