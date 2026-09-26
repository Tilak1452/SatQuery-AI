"""
Shared utilities for satellite imagery pipelines.
"""

from __future__ import annotations

import math
from typing import Any


# GEE thumbnail API has practical limits around 4096px per side.
# Beyond this, requests start failing or becoming very slow.
_MAX_THUMB_DIMENSION = 2048


def compute_thumb_params(
    bounds_coords: list[list[float]],
    native_scale: int = 10,
) -> dict[str, Any]:
    """
    Compute the optimal getThumbURL parameters for a given AOI bounding box.

    For small/medium AOIs the function returns ``{"scale": native_scale}``
    so GEE renders at native pixel resolution (no blurry upscaling).

    For very large AOIs where native resolution would exceed the max
    thumbnail dimension, it returns ``{"dimensions": _MAX_THUMB_DIMENSION}``
    to prevent GEE errors while keeping the image as sharp as possible.

    Args:
        bounds_coords: Outer ring of the bounding box as returned by
            ``geometry.bounds().coordinates().getInfo()[0]``.
            A list of [lon, lat] pairs.
        native_scale: Native pixel resolution in meters (10 for Sentinel).

    Returns:
        dict suitable for merging into the getThumbURL params.
    """
    # Approximate bounding box size in meters
    lons = [c[0] for c in bounds_coords]
    lats = [c[1] for c in bounds_coords]

    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)

    mean_lat_rad = math.radians((min_lat + max_lat) / 2)

    width_m = (max_lon - min_lon) * 111_320 * math.cos(mean_lat_rad)
    height_m = (max_lat - min_lat) * 110_540

    # Native resolution pixel count
    width_px = width_m / native_scale
    height_px = height_m / native_scale
    max_px = max(width_px, height_px)

    if max_px <= _MAX_THUMB_DIMENSION:
        # Native resolution fits comfortably — render at full sharpness
        return {"scale": native_scale}
    else:
        # Cap to max dimension to avoid GEE limits
        return {"dimensions": _MAX_THUMB_DIMENSION}
