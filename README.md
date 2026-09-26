# SatQuery AI 🛰️

> **Interactive Satellite Imagery Retrieval & Dual-Modal Earth Observation Engine**  
> Retrieve **Sentinel-2 Optical RGB** and **Sentinel-1 SAR Radar** imagery for any Area of Interest (AOI) directly via Google Earth Engine (GEE).

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Google Earth Engine](https://img.shields.io/badge/GEE-Earth%20Engine%20API-4285F4?style=flat-square&logo=google&logoColor=white)](https://earthengine.google.com)
[![Mapbox GL](https://img.shields.io/badge/Maps-Mapbox%20GL%20JS-000000?style=flat-square&logo=mapbox&logoColor=white)](https://www.mapbox.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 🌟 Highlights & Key Features

- **Dual Retrieval Modes**:
  - **Cloud-Free Composite**: Statistical median cloud & speckle filtering for instant visual baseline (1 Optical RGB + 1 SAR pair).
  - **Time-Series Stack (10–20 Passes)**: Multi-scene temporal harvesting of individual satellite passes for change detection and multimodal AI models (EarthDial, EarthMind, Telescoper).
- **Dual-Modal Satellite Pipelines**:
  - **Sentinel-2 Optical**: True-color RGB (Bands 4, 3, 2) filtered for low cloud cover from `COPERNICUS/S2_SR_HARMONIZED`.
  - **Sentinel-1 SAR Radar**: All-weather C-band backscatter (VV / VH polarizations) from `COPERNICUS/S1_GRD` that penetrates clouds and captures surface structure.
- **Asynchronous Dataset Harvester**: Instant high-resolution preview delivery in 2–3 seconds while full 10m GeoTIFFs are downloaded and packaged in the background into a single `.zip` archive.
- **Strict GeoTIFF & Timestamp Preservation**:
  - Standardized filename convention: `SatQuery_[Sensor]_[Modality]_[YYYYMMDD]_[THHMMSSZ].tif`.
  - Native 10m spatial resolution and CRS projection metadata preserved.
  - Natural alphabetical sorting ($A \rightarrow Z$) = strict chronological order ($T_1 \rightarrow T_n$).
- **Cross-Modal Temporal Chaining**: Optical pipeline executes first, and SAR automatically filters to ±7 days of optical acquisition for maximum physical coherence.
- **Real-Time Streaming**: WebSocket telemetry streaming live pipeline status and background ZIP compression progress.
- **Custom Image Upload & Analysis**: Upload external GeoTIFF or PNG imagery to analyze custom spatial datasets using Rasterio and OpenCV.
- **One-Click Launch**: Instant startup via `start.bat` orchestrating both frontend and backend dev environments simultaneously.

---

## 🏗️ System Architecture

```
User draws polygon on map
    -> Frontend validates area (1-250 km²)
    -> POST /api/aoi with GeoJSON geometry
    -> Backend registers job & returns job_id
    -> Frontend connects via WebSocket (/ws/process/{job_id})
    -> Backend triggers Optical Pipeline (Sentinel-2)
    -> Backend chains SAR Pipeline (Sentinel-1, ±7d coherence)
    -> Real-time telemetry streamed back to browser
    -> High-resolution preview thumbnails & GeoTIFF download URLs displayed
```

For complete technical specifications, schemas, and design decisions, please see the [**ARCHITECTURE.md**](set-query-ai/ARCHITECTURE.md).

---

## 📁 Repository Structure

```
.
├── start.bat                          # One-click launcher (backend + frontend)
├── auth_gee.bat                       # Google Earth Engine authentication helper
├── check.js                           # Automated smoke-test verification script
├── package.json                       # Root script package
└── set-query-ai/
    ├── README.md                      # Module summary
    ├── ARCHITECTURE.md                # Comprehensive technical architecture
    ├── backend/                       # Python FastAPI Backend
    │   ├── app/
    │   │   ├── main.py                # FastAPI routes & WebSocket server
    │   │   ├── config.py              # Pydantic configuration & settings
    │   │   ├── gee_client.py          # Google Earth Engine initialization
    │   │   ├── schemas.py             # Pydantic request/response schemas
    │   │   └── pipelines/
    │   │       ├── optical.py         # Sentinel-2 RGB pipeline
    │   │       └── sar.py             # Sentinel-1 SAR pipeline
    │   ├── requirements.txt           # Python dependencies
    │   ├── run_backend.bat            # Backend launcher script
    │   └── .env.example               # Backend environment template
    └── frontend/                      # React 19 + TypeScript + Vite + Tailwind
        ├── src/
        │   ├── components/            # MapView, ActionBar, ResultsPanel, etc.
        │   ├── App.tsx                # App composition & state machine
        │   └── index.css              # Custom styling & tokens
        ├── package.json               # Frontend dependencies
        ├── run_frontend.bat           # Frontend launcher script
        └── .env.example               # Frontend environment template
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (3.10+)
- [Mapbox Access Token](https://account.mapbox.com/)
- [Google Earth Engine](https://earthengine.google.com/) account or Service Account key

### 1. Environment Configuration

**Backend:**
Copy `set-query-ai/backend/.env.example` to `set-query-ai/backend/.env`:
```env
GEE_SERVICE_ACCOUNT_KEY_PATH=./secrets/gee-service-account.json
GEE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FRONTEND_ORIGIN=http://localhost:5173
MAX_AOI_AREA_KM2=250
```
*(Alternatively, run `earthengine authenticate` on your machine to use standard user credentials).*

**Frontend:**
Copy `set-query-ai/frontend/.env.example` to `set-query-ai/frontend/.env`:
```env
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

### 2. Run the Application

#### Windows (One-Click):
Double-click `start.bat` or run:
```bat
start.bat
```
This automatically boots the FastAPI backend (Port 8000), Vite dev server (Port 5173), and opens the browser.

#### Manual Startup:

**Terminal 1 (Backend):**
```bash
cd set-query-ai/backend
python -m venv venv
venv\Scripts\activate       # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd set-query-ai/frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to use the application.

---

## 🔬 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v3, Mapbox GL JS, Lucide Icons |
| **Backend** | Python 3.12, FastAPI, Uvicorn, WebSockets, Pydantic v2 |
| **Earth Observation** | Google Earth Engine API (`earthengine-api`), Rasterio, OpenCV, NumPy |
| **Data Sources** | Sentinel-2 MSI (`COPERNICUS/S2_SR_HARMONIZED`), Sentinel-1 SAR (`COPERNICUS/S1_GRD`), EOX Cloudless Mosaic |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
