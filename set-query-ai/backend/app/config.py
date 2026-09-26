"""
Application configuration loaded from environment variables.
Uses pydantic-settings for typed config with defaults.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Central configuration for the Set Query AI backend.
    All values can be overridden via environment variables or a .env file.
    """

    # Google Earth Engine
    gee_service_account_key_path: str = Field(
        default="./secrets/gee-service-account.json",
        description="Path to the GEE service account JSON key file",
    )
    gee_service_account_email: str = Field(
        default="",
        description="Email address of the GEE service account",
    )
    gee_project: str = Field(
        default="krishi-dhristi",
        description="Google Cloud Project ID for Earth Engine",
    )

    # CORS
    frontend_origin: str = Field(
        default="http://localhost:5173",
        description="Allowed CORS origin for the frontend dev server",
    )

    # AOI constraints
    min_aoi_area_km2: float = Field(
        default=1.0,
        description=(
            "Minimum allowed AOI area in km². At Sentinel's 10m native resolution, "
            "1 km² yields ~100x100 native pixels — the practical minimum for a "
            "useful satellite image preview."
        ),
    )
    max_aoi_area_km2: float = Field(
        default=250.0,
        description=(
            "Maximum allowed AOI area in square kilometers. "
            "Reduced from 500 to stay safely under GEE's 32 MB "
            "getDownloadURL limit at 10m / 3-band / 8-bit."
        ),
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


# Singleton settings instance — import this throughout the app
settings = Settings()
