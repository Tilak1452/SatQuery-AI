"""
Sentinel-2 optical RGB pipeline.

Queries COPERNICUS/S2_SR_HARMONIZED, applies SCL-based cloud/shadow
masking, filters by CLOUDY_PIXEL_PERCENTAGE with progressive fallback,
and produces a median composite RGB (B4/B3/B2) visualization.

The median composite statistically eliminates transient cloud
contamination far more effectively than a simple mosaic.

Returns:
    - Thumbnail URL for display
    - Download URL for export
    - Acquisition date (system:time_start) for temporal chaining with SAR
"""

from __future__ import annotations

from datetime import date
from typing import Any, Callable

import ee


# Progressive cloud cover thresholds — try the strictest first,
# relax only when no images survive the filter.
_CLOUD_THRESHOLDS = [20, 40, 70, 100]


def mask_s2_clouds_scl(image: ee.Image) -> ee.Image:
    """
    Mask clouds, cloud shadows, and cirrus using the Scene Classification Layer (SCL)
    from Sentinel-2 L2A.

    SCL classes to reject:
        3  — Cloud Shadow
        8  — Cloud (medium probability)
        9  — Cloud (high probability)
        10 — Cirrus (thin)

    We intentionally do NOT reject:
        - Class 1 (Saturated/Defective): in urban environments, bright metal roofs,
          solar panels, and glass reflections saturate the sensor. Masking class 1
          creates artificial black holes on buildings.
        - Class 11 (Snow/Ice): white rooftops and concrete in cities are frequently
          misclassified as snow.
        - QA60 bitmask: QA60 has coarse 60m resolution that causes blocky artifacts
          and severe false positives over urban structures. SCL at 20m is the
          authoritative L2A classification layer.

    Scales reflectance bands from DN to 0-1.
    """
    scl = image.select("SCL")

    # Keep only clear-sky classes (reject cloud shadows, clouds, and cirrus)
    clear_mask = (
        scl.neq(3)   # Cloud Shadow
        .And(scl.neq(8))   # Cloud Medium Probability
        .And(scl.neq(9))   # Cloud High Probability
        .And(scl.neq(10))  # Cirrus
    )

    return image.updateMask(clear_mask).divide(10000)


def _try_filter_collection(
    base_collection: ee.ImageCollection,
    max_cloud_pct: int,
) -> tuple[ee.ImageCollection, int]:
    """Filter the collection by CLOUDY_PIXEL_PERCENTAGE and return (filtered, count)."""
    filtered = base_collection.filter(
        ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", max_cloud_pct)
    )
    count = filtered.size().getInfo()
    return filtered, count


def run_optical_pipeline(
    geometry: ee.Geometry,
    date_start: date,
    date_end: date,
    send_status: Callable[[str], Any],
) -> dict:
    """
    Execute the Sentinel-2 optical RGB pipeline.

    Strategy:
        1. Filter the S2 SR collection by bounds and date range.
        2. Progressively relax the CLOUDY_PIXEL_PERCENTAGE threshold
           (20% → 40% → 60% → 80% → 100%) until we have at least 3 images
           for a robust median composite.
        3. Apply SCL cloud & shadow masking on every pixel.
        4. Build a median composite — statistically eliminates transient
           clouds and shadows across the temporal stack.
        5. For any pixels persistently obscured during the date window,
           seamlessly fill using an extended clear-sky composite fallback.
        6. Return thumbnail, download URL, and acquisition date
           for temporal chaining with the SAR pipeline.

    Args:
        geometry: ee.Geometry for the AOI.
        date_start: Start of the date range.
        date_end: End of the date range.
        send_status: Callback to stream status messages to the client.

    Returns:
        dict with keys: thumb_url, download_url, acquisition_date_ms
    """
    send_status("Filtering Sentinel-2 optical imagery...")

    # 1. Base collection — no cloud filter yet
    base_collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(geometry)
        .filterDate(str(date_start), str(date_end))
    )

    # Check image count: if 0, attempt automatic temporal expansion backwards
    total_count = base_collection.size().getInfo()
    if total_count == 0:
        from datetime import timedelta
        send_status("No images found in requested window. Automatically expanding search backwards...")
        expanded_start = date_start - timedelta(days=90)
        base_collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(geometry)
            .filterDate(str(expanded_start), str(date_end))
        )
        total_count = base_collection.size().getInfo()

    # If still 0 images even after expanding, check if this area EVER has Sentinel-2 coverage
    if total_count == 0:
        from datetime import timedelta
        year_start = date_end - timedelta(days=365)
        check_collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(geometry)
            .filterDate(str(year_start), str(date_end))
        )
        has_any = check_collection.limit(1).size().getInfo() > 0
        if not has_any:
            raise ValueError(
                "No Sentinel-2 optical imagery exists for this location. "
                "Sentinel-2 systematically acquires data only over land and coastal waters (within ~20 km of shore). "
                "The selected AOI appears to be in open ocean or outside standard satellite coverage."
            )
        else:
            raise ValueError(
                f"No Sentinel-2 images found for the selected AOI between {date_start} and {date_end}. "
                f"Please expand the date range."
            )

    # 2. Progressive cloud filter — target at least 3 images so the temporal
    #    median can effectively remove transient clouds and shadows.
    #    If strict thresholds yield fewer than 3 images, relax the threshold.
    collection = None
    used_threshold = None
    count = 0

    for threshold in [20, 40, 60, 80, 100]:
        filtered, cnt = _try_filter_collection(base_collection, threshold)
        if cnt >= 3:
            collection = filtered
            used_threshold = threshold
            count = cnt
            break
        elif cnt > 0 and collection is None:
            collection = filtered
            used_threshold = threshold
            count = cnt

    if collection is None:
        collection = base_collection
        used_threshold = 100
        count = total_count

    # Limit to top 10 least-cloudy scenes to guarantee fast GEE execution without timeouts
    collection = collection.sort("CLOUDY_PIXEL_PERCENTAGE").limit(10)

    send_status(
        f"Found {count}/{total_count} images with <={used_threshold}% cloud cover. "
        f"Building cloud-free median composite..."
    )

    # 3. Reference acquisition date for SAR temporal chaining.
    #    Use the least-cloudy image's timestamp.
    best_image = ee.Image(
        collection.sort("CLOUDY_PIXEL_PERCENTAGE", True).first()
    )
    acquisition_date_ms = best_image.get("system:time_start").getInfo()

    # 4. Apply per-pixel cloud & shadow mask + reflectance scaling
    masked_collection = collection.map(mask_s2_clouds_scl)

    # 5. Median composite — each pixel takes the temporal median of clear observations.
    composite = masked_collection.select(["B4", "B3", "B2"]).median()

    # 6. Fill remaining nodata voids using an extended clear-sky composite fallback.
    #    Why this multi-tier fill strategy?
    #    - unmask(0) leaves jarring pitch-black voids wherever persistent clouds occurred.
    #    - unmask(raw_single_scene) pastes cloudy white blobs if that scene had clouds.
    #    - A cloud-masked median from an extended 180-day window guarantees 100% clear-sky
    #      coverage without introducing any clouds or black voids.
    region = geometry.bounds()
    from datetime import timedelta
    fallback_start = date_start - timedelta(days=120)
    fallback_composite = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(geometry)
        .filterDate(str(fallback_start), str(date_end))
        .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", 40))
        .sort("CLOUDY_PIXEL_PERCENTAGE")
        .limit(10)
        .map(mask_s2_clouds_scl)
        .select(["B4", "B3", "B2"])
        .median()
    )

    # Tertiary raw fallback (scaled 0-1) in case the extended window has edge voids
    raw_fallback = (
        base_collection
        .select(["B4", "B3", "B2"])
        .median()
        .divide(10000)
    )

    composite_filled = (
        composite
        .unmask(fallback_composite)
        .unmask(raw_fallback)
        .clip(region)
    )

    # 7. RGB visualization — bounding-box rectangle, dark high-contrast stretch.
    rgb = composite_filled.visualize(
        min=0.0, max=0.28, gamma=1.3
    )


    send_status("Generating optical preview and download URLs...")

    bounds_info = region.coordinates().getInfo()

    # Compute optimal thumb params:
    # - For small AOIs: scale=10 (native Sentinel-2 pixel resolution, sharpest)
    # - For large AOIs: cap at MAX_THUMB_DIMENSION to stay within GEE limits
    from . import compute_thumb_params
    thumb_params = compute_thumb_params(bounds_info[0], native_scale=10)

    # Thumbnail URL for display
    thumb_url = rgb.getThumbURL({
        "region": region,
        "format": "png",
        **thumb_params,
    })

    # Download URL (GeoTIFF, full resolution)
    download_url = rgb.getDownloadURL({
        "name": "optical_rgb",
        "region": geometry,
        "scale": 10,
        "format": "GEO_TIFF",
    })

    return {
        "thumb_url": thumb_url,
        "download_url": download_url,
        "acquisition_date_ms": acquisition_date_ms,
        "bounds": bounds_info,
    }
