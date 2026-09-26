"""
Shared utilities for satellite imagery pipelines.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any


# Desired preview display resolution for web browsers (1024px gives razor-sharp previews)
_PREVIEW_DIMENSION = 1024


def format_gee_timestamp(time_ms: int | float | None) -> tuple[str, str]:
    """
    Convert GEE epoch ms to:
    - ISO 8601 string: 'YYYY-MM-DDTHH:MM:SSZ'
    - Filename slug: 'YYYYMMDD_THHMMSSZ'
    """
    if not time_ms:
        now = datetime.now(timezone.utc)
        return now.strftime("%Y-%m-%dT%H:%M:%SZ"), now.strftime("%Y%m%d_T%H%M%SZ")
    
    dt = datetime.fromtimestamp(float(time_ms) / 1000.0, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ"), dt.strftime("%Y%m%d_T%H%M%SZ")


def compute_thumb_params(
    bounds_coords: list[list[float]],
    native_scale: int = 10,
) -> dict[str, Any]:
    """
    Compute optimal getThumbURL parameters.
    Uses dimensions: 1024 so previews are rendered in crisp, high-definition HD
    (preventing small AOIs from being stretched into blurry, pixelated blocks in the browser).
    """
    return {"dimensions": _PREVIEW_DIMENSION}
