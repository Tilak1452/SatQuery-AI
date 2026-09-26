"""
Sentinel-1 SAR backscatter pipeline.

Queries COPERNICUS/S1_GRD within a ±7 day window of the optical
acquisition date (temporal chaining), applies speckle filtering
(focal median), and produces a VV/VH/VV-VH composite.

The SAR pipeline is intentionally sequential after the optical pipeline
to ensure cross-modal temporal coherence.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable

import ee

# Temporal window around optical acquisition date (days)
SAR_TEMPORAL_WINDOW_DAYS = 7


def _apply_speckle_filter(image: ee.Image) -> ee.Image:
    """Apply focal median speckle filter — kept for potential future use
    but NOT called in the main pipeline. The temporal median composite
    over multiple acquisitions already reduces speckle without blurring edges."""
    return image.focalMedian(
        radius=15,
        kernelType="circle",
        units="meters",
    )


def run_sar_pipeline(
    geometry: ee.Geometry,
    optical_acquisition_date_ms: int,
    send_status: Callable[[str], Any],
) -> dict:
    """
    Execute the Sentinel-1 SAR pipeline, temporally chained to optical.

    Args:
        geometry: ee.Geometry for the AOI.
        optical_acquisition_date_ms: system:time_start from the optical image (ms).
        send_status: Callback to stream status messages to the client.

    Returns:
        dict with keys: thumb_url, download_url
    """
    # Compute ±7 day window around optical acquisition
    optical_dt = datetime.utcfromtimestamp(optical_acquisition_date_ms / 1000)
    sar_start = optical_dt - timedelta(days=SAR_TEMPORAL_WINDOW_DAYS)
    sar_end = optical_dt + timedelta(days=SAR_TEMPORAL_WINDOW_DAYS)

    send_status(
        f"Filtering Sentinel-1 SAR imagery "
        f"(±{SAR_TEMPORAL_WINDOW_DAYS}d of optical: "
        f"{sar_start.strftime('%Y-%m-%d')} to {sar_end.strftime('%Y-%m-%d')})..."
    )

    collection = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(geometry)
        .filterDate(sar_start.strftime("%Y-%m-%d"), sar_end.strftime("%Y-%m-%d"))
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
    )

    count = collection.size().getInfo()
    if count == 0:
        raise ValueError(
            f"No Sentinel-1 SAR images found for the selected AOI "
            f"within ±{SAR_TEMPORAL_WINDOW_DAYS} days of the optical acquisition "
            f"({optical_dt.strftime('%Y-%m-%d')}). "
            f"Try a different date range."
        )

    send_status(f"Found {count} Sentinel-1 images. Building SAR composite...")

    # Create a median composite from all images in the window.
    # Temporal median across multiple acquisitions is a highly effective
    # speckle reducer that preserves spatial edges — no spatial filtering needed.
    composite = collection.median()

    # Select VV band — provides the sharpest urban detail via double-bounce
    # returns from buildings. Using VV alone is sharper than the VV+VH average
    # because VH adds noise without adding urban structural detail.
    vv = composite.select("VV")

    # Clip to bounding box and fill any boundary nodata with -30 dB (rendered black)
    thumb_region = geometry.bounds()
    sar_vis = vv.unmask(-30).clip(thumb_region).visualize(
        min=-20,
        max=2,
    )

    send_status("Generating SAR preview and download URLs...")

    # Compute optimal thumb parameters — native scale for small AOIs,
    # dimension-capped for large AOIs to avoid GEE limits.
    from . import compute_thumb_params
    bounds_info = thumb_region.coordinates().getInfo()
    thumb_params = compute_thumb_params(bounds_info[0], native_scale=10)

    # Thumbnail URL for display
    thumb_url = sar_vis.getThumbURL({
        "region": thumb_region,
        "format": "png",
        **thumb_params,
    })

    # Combine into a single multi-band image for pure VV and VH download
    # To stay under the 32MB limit, we use the 8-bit visualization instead of raw float values
    
    # Download URL (GeoTIFF)
    download_url = sar_vis.getDownloadURL({
        "name": "sar_composite",
        "region": geometry,
        "scale": 10,
        "format": "GEO_TIFF",
    })

    return {
        "thumb_url": thumb_url,
        "download_url": download_url,
    }
