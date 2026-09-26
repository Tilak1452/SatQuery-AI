# Set Query AI — Backend

FastAPI backend for AOI-based satellite imagery retrieval via Google Earth Engine.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config` | Public config (max AOI area) — single source of truth |
| `POST` | `/api/aoi` | Submit AOI geometry, returns `job_id` |
| `WS` | `/ws/process/{job_id}` | Stream processing status + final image URLs |

## GEE Pipelines

1. **Optical** (`pipelines/optical.py`): Sentinel-2 SR Harmonized → least-cloudy → QA60 cloud mask → RGB (B4/B3/B2) → uint8
2. **SAR** (`pipelines/sar.py`): Sentinel-1 GRD → ±7d of optical date → IW mode → VV/VH composite → focal median speckle filter → uint8

The SAR pipeline is chained to optical — it uses the optical image's acquisition date to filter within a ±7 day window.

## Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env    # Fill in credentials
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEE_SERVICE_ACCOUNT_KEY_PATH` | `./secrets/gee-service-account.json` | Path to GEE service account JSON key |
| `GEE_SERVICE_ACCOUNT_EMAIL` | *(required)* | GEE service account email |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `MAX_AOI_AREA_KM2` | `250` | Maximum AOI area in km² |
