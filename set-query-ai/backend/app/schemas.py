"""
Pydantic models for API requests, responses, and WebSocket messages.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# REST: AOI submission
# ---------------------------------------------------------------------------

class AoiRequest(BaseModel):
    """GeoJSON geometry for the area of interest, plus optional date window and mode."""

    geometry: dict[str, Any] = Field(
        ...,
        description="GeoJSON Polygon or MultiPolygon geometry",
    )
    date_start: Optional[date] = Field(
        default=None,
        description="Start of date range (defaults to 60 days ago)",
    )
    date_end: Optional[date] = Field(
        default=None,
        description="End of date range (defaults to today)",
    )
    mode: Literal["composite", "timeseries"] = Field(
        default="composite",
        description="Retrieval mode: 'composite' (cloud-free pair) or 'timeseries' (multi-scene stack)",
    )
    max_scenes: Optional[int] = Field(
        default=10,
        ge=2,
        le=20,
        description="Max scenes to harvest in timeseries mode (default 10)",
    )

    @field_validator("geometry")
    @classmethod
    def validate_geometry_type(cls, v: dict) -> dict:
        geo_type = v.get("type", "")
        if geo_type not in ("Polygon", "MultiPolygon"):
            raise ValueError(
                f"Geometry type must be Polygon or MultiPolygon, got '{geo_type}'"
            )
        if "coordinates" not in v:
            raise ValueError("Geometry must include 'coordinates'")
        return v

    def effective_date_start(self) -> date:
        return self.date_start or (datetime.utcnow().date() - timedelta(days=60))

    def effective_date_end(self) -> date:
        return self.date_end or datetime.utcnow().date()


class AoiResponse(BaseModel):
    """Returned after successful AOI submission."""
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ConfigResponse(BaseModel):
    """Public configuration values served to the frontend."""
    max_aoi_area_km2: float
    min_aoi_area_km2: float


# ---------------------------------------------------------------------------
# WebSocket messages (server → client)
# ---------------------------------------------------------------------------

class StatusMessage(BaseModel):
    """Progress update streamed during processing."""
    type: Literal["status"] = "status"
    message: str


class ZipProgressMessage(BaseModel):
    """Background dataset zipping progress update."""
    type: Literal["zip_progress"] = "zip_progress"
    job_id: str
    status: Literal["processing", "ready", "failed"]
    progress_pct: int
    message: str
    download_url: Optional[str] = None
    size_mb: Optional[float] = None
    total_scenes: Optional[int] = None


class SceneInfo(BaseModel):
    """Metadata for an individual harvested satellite scene."""
    filename: str
    sensor: Literal["Sentinel-2", "Sentinel-1"]
    modality: Literal["Optical RGB", "SAR VV"]
    timestamp_utc: str
    cloud_pct: Optional[float] = None
    download_url: Optional[str] = None


class ResultMessage(BaseModel):
    """Final result containing image preview URLs and dataset metadata."""
    type: Literal["result"] = "result"
    optical_url: Optional[str] = None
    sar_url: Optional[str] = None
    optical_download_url: Optional[str] = None
    sar_download_url: Optional[str] = None
    optical_error: Optional[str] = None
    sar_error: Optional[str] = None
    aoi_bounds: list[list[float]]  # [[minLon, minLat], [maxLon, maxLat]]
    mode: Literal["composite", "timeseries"] = "composite"
    optical_timestamp: Optional[str] = None
    sar_timestamp: Optional[str] = None
    zip_status: Optional[Literal["pending", "processing", "ready", "failed"]] = "pending"
    zip_url: Optional[str] = None
    zip_size_mb: Optional[float] = None
    total_scenes: Optional[int] = None
    scenes: list[SceneInfo] = Field(default_factory=list)


class ErrorMessage(BaseModel):
    """Error details sent before closing the WebSocket."""
    type: Literal["error"] = "error"
    message: str
