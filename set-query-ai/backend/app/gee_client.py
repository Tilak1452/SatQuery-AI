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

    # Cloud Deployment Support: If GEE_SERVICE_ACCOUNT_JSON is set in environment (e.g. Render/Railway),
    # write it to key_path so ee.ServiceAccountCredentials can load it seamlessly.
    if settings.gee_service_account_json and not key_path.is_file():
        try:
            key_path.parent.mkdir(parents=True, exist_ok=True)
            with open(key_path, "w", encoding="utf-8") as f:
                f.write(settings.gee_service_account_json.strip())
            print(f"Info: Loaded service account key from GEE_SERVICE_ACCOUNT_JSON environment variable.")
        except Exception as write_err:
            print(f"Warning: Could not write GEE_SERVICE_ACCOUNT_JSON to '{key_path}': {write_err}")

    try:
        if key_path.is_file():
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
            print(f"Info: Service account key not found at '{key_path}'. Using local Earth Engine user credentials.")
            init_success = False
            last_init_err = None

            # 1. Try with configured project ID
            if project_id:
                try:
                    ee.Initialize(project=project_id)
                    init_success = True
                    print(f"OK: Initialized Earth Engine with project: {project_id}")
                except Exception as p_err:
                    last_init_err = p_err
                    print(f"Notice: Initializing with project '{project_id}' gave: {p_err}. Trying default project...")

            # 2. Try default without project parameter
            if not init_success:
                try:
                    ee.Initialize()
                    init_success = True
                    print("OK: Initialized Earth Engine with default local project")
                except Exception as def_err:
                    last_init_err = def_err

            if not init_success:
                raise last_init_err or RuntimeError("Failed local Earth Engine initialization.")

        _initialized = True
    except Exception as e:
        raise RuntimeError(
            f"Google Earth Engine is not authenticated on this machine: {e}\n\n"
            "HOW TO FIX (One-time setup):\n"
            "1. Run 'auth_gee.bat' in the project root (D:\\Satquery\\auth_gee.bat)\n"
            "   (Or open terminal and run: earthengine authenticate)\n"
            "2. Sign in with your Google account in the browser tab that opens.\n"
            "3. Click 'Allow', return here, and click 'Get Imagery' again."
        ) from e


def get_ee():
    """
    Return the initialized ee module.
    Ensures GEE is initialized before returning.
    """
    if not _initialized:
        initialize_gee()
    return ee
