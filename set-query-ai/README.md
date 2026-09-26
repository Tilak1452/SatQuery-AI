# Set Query AI

Interactive satellite imagery retrieval for any Area of Interest (AOI).

Draw a region on an interactive map → receive **Sentinel-2 optical RGB** and **Sentinel-1 SAR backscatter** imagery from Google Earth Engine.

## Architecture

```
frontend/ (React + TypeScript + Vite + Tailwind v3)
  └── Mapbox GL map with draw tools → WebSocket status streaming

backend/ (Python FastAPI + earthengine-api)
  └── GEE pipelines: Optical (Sentinel-2) → SAR (Sentinel-1, ±7d chained)
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Mapbox access token
- Google Earth Engine service account + JSON key

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # Fill in GEE credentials
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
copy .env.example .env       # Fill in VITE_MAPBOX_TOKEN
npm run dev
```

Open http://localhost:5173 and draw an AOI on the map.

## Key Design Decisions

- **Temporal chaining**: Optical pipeline runs first, SAR is filtered to ±7 days of optical acquisition for cross-modal coherence
- **GEE 32 MB safety**: All exports are 3-band uint8; default max AOI is 250 km²
- **DRY validation**: `GET /api/config` serves `max_aoi_area_km2` — frontend fetches it on mount (no hardcoded limits)
- **Memory-safe**: Job store uses `dict.pop()` cleanup in a `finally` block (prototype-only, migrate to Redis/PG for production)
