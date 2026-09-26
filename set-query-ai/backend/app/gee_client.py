import json
import os
from pathlib import Path

import ee
from .config import settings


_initialized = False
BACKEND_DIR = Path(__file__).resolve().parent.parent


def get_key_path() -> Path:
    """Resolve the service account key path, supporting relative paths from backend root."""
    p = Path(settings.gee_service_account_key_path)
    if not p.is_absolute():
        p = (BACKEND_DIR / p).resolve()
    return p


def initialize_gee() -> None:
    """
    Initialize the Earth Engine API using service account credentials or local fallback.
    Called once at application startup. Subsequent calls are no-ops.

    Raises:
        RuntimeError: If credentials are missing or initialization fails.
    """
    global _initialized
    if _initialized:
        return

    key_path = get_key_path()
    project_id = settings.gee_project or None

    try:
        if key_path.is_file():
            # If project_id or email not explicitly set, attempt to read from the JSON key
            email = settings.gee_service_account_email
            try:
                with open(key_path, "r", encoding="utf-8") as f:
                    key_data = json.load(f)
                    if not project_id:
                        project_id = key_data.get("project_id")
                    if not email:
                        email = key_data.get("client_email", "")
            except Exception:
                pass

            credentials = ee.ServiceAccountCredentials(
                email,
                str(key_path),
            )
            if project_id:
                ee.Initialize(credentials, project=project_id)
            else:
                ee.Initialize(credentials)
            print(f"OK: Initialized Earth Engine with service account key: {key_path}")
        else:
            print(f"Warning: GEE Service account key not found at '{key_path}'. Falling back to default local authentication.")
            if project_id:
                ee.Initialize(project=project_id)
            else:
                ee.Initialize()
            print("OK: Initialized Earth Engine with default local credentials")
        _initialized = True
    except Exception as e:
        raise RuntimeError(
            f"Failed to initialize Google Earth Engine: {e}\n"
            f"Expected service account key at: {key_path}\n"
            "Please ensure you have placed your Google Cloud service account JSON key at that location, "
            "or run 'earthengine authenticate' in your terminal for local account authentication."
        ) from e


def get_ee():
    """
    Return the initialized ee module.
    Ensures GEE is initialized before returning.
    """
    if not _initialized:
        initialize_gee()
    return ee

