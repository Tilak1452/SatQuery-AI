"""
Sentinel-2 optical RGB pipeline.

Queries COPERNICUS/S2_SR_HARMONIZED, applies SCL-based cloud/shadow
masking, filters by CLOUDY_PIXEL_PERCENTAGE with progressive fallback,
and produces:
- In "composite" mode: a cloud-free median composite RGB (B4/B3/B2)
- In "timeseries" mode: primary clearest preview + metadata for top N timestamped scenes

All downloads are named with precise UTC acquisition timestamps:
Format: SatQuery_S2_Optical_YYYYMMDD_THHMMSSZ.tif
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Callable

import ee

from . import compute_thumb_params, format_gee_timestamp


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
    mode: str = "composite",
    max_scenes: int = 10,
) -> dict:
    """
    Execute the Sentinel-2 optical RGB pipeline.
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

    # 2. Progressive cloud filter
    collection = None
    used_threshold = None
    count = 0

    for threshold in _CLOUD_THRESHOLDS:
        filtered, cnt = _try_filter_collection(base_collection, threshold)
        if cnt >= (1 if mode == "timeseries" else 3):
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

    region = geometry.bounds()
    bounds_info = region.coordinates().getInfo()
    thumb_params = compute_thumb_params(bounds_info[0], native_scale=10)

    # Pick the best / least cloudy image as reference and primary preview
    best_image = ee.Image(
        collection.sort("CLOUDY_PIXEL_PERCENTAGE", True).first()
    )
    acquisition_date_ms = best_image.get("system:time_start").getInfo()
    iso_timestamp, filename_slug = format_gee_timestamp(acquisition_date_ms)

    scenes_metadata: list[dict[str, Any]] = []

    if mode == "timeseries":
        send_status(f"Harvesting metadata for top {min(count, max_scenes)} optical scenes...")
        sorted_scenes = collection.sort("CLOUDY_PIXEL_PERCENTAGE").limit(max_scenes)
        features = sorted_scenes.getInfo().get("features", [])

        for feat in features:
            props = feat.get("properties", {})
            t_ms = props.get("system:time_start")
            t_iso, t_slug = format_gee_timestamp(t_ms)
            s_cloud = props.get("CLOUDY_PIXEL_PERCENTAGE", 0.0)
            scenes_metadata.append({
                "id": feat.get("id"),
                "sensor": "Sentinel-2",
                "modality": "Optical RGB",
                "time_ms": t_ms,
                "timestamp_utc": t_iso,
                "slug": t_slug,
                "cloud_pct": round(float(s_cloud), 1) if s_cloud is not None else None,
                "filename": f"SatQuery_S2_Optical_{t_slug}.tif",
            })

    # Prepare preview visualization
    if mode == "timeseries":
        send_status(f"Selected clearest scene ({iso_timestamp}) for instant preview...")
        # Use the best single scene masked and scaled
        preview_img = (
            mask_s2_clouds_scl(best_image)
            .select(["B4", "B3", "B2"])
            .unmask(best_image.select(["B4", "B3", "B2"]).divide(10000))
            .clip(region)
        )
        rgb = preview_img.visualize(min=0.0, max=0.28, gamma=1.3)
    else:
        # Composite mode: median composite
        send_status(
            f"Found {count}/{total_count} images with <={used_threshold}% cloud cover. "
            f"Building cloud-free median composite..."
        )
        masked_collection = collection.sort("CLOUDY_PIXEL_PERCENTAGE").limit(10).map(mask_s2_clouds_scl)
        composite = masked_collection.select(["B4", "B3", "B2"]).median()

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
        raw_fallback = base_collection.select(["B4", "B3", "B2"]).median().divide(10000)
        composite_filled = (
            composite
            .unmask(fallback_composite)
            .unmask(raw_fallback)
            .clip(region)
        )
        rgb = composite_filled.visualize(min=0.0, max=0.28, gamma=1.3)

    send_status("Generating optical preview...")

    thumb_url = rgb.getThumbURL({
        "region": region,
        "format": "png",
        **thumb_params,
    })

    # Timestamped GeoTIFF download name
    download_name = f"SatQuery_S2_Optical_{filename_slug}"
    download_url = rgb.getDownloadURL({
        "name": download_name,
        "region": geometry,
        "scale": 10,
        "format": "GEO_TIFF",
    })

    return {
        "thumb_url": thumb_url,
        "download_url": download_url,
        "acquisition_date_ms": acquisition_date_ms,
        "timestamp_utc": iso_timestamp,
        "filename_slug": filename_slug,
        "bounds": bounds_info,
        "scenes": scenes_metadata,
    }
