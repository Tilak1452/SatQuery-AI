/**
 * Shared TypeScript types for SatQuery AI.
 */

// ---------------------------------------------------------------------------
// Application state machine
// ---------------------------------------------------------------------------

export type AppState =
  | "idle"
  | "aoi_selected"
  | "processing"
  | "results_ready"
  | "error";

export type RetrievalMode = "composite" | "timeseries";

// ---------------------------------------------------------------------------
// Server config (fetched from GET /api/config)
// ---------------------------------------------------------------------------

export interface AppConfig {
  max_aoi_area_km2: number;
  min_aoi_area_km2: number;
}

// ---------------------------------------------------------------------------
// GeoJSON AOI
// ---------------------------------------------------------------------------

export interface AoiGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

// ---------------------------------------------------------------------------
// Scene & Dataset Types
// ---------------------------------------------------------------------------

export interface SceneMetadata {
  filename: string;
  sensor: string;
  modality: string;
  timestamp_utc: string;
  cloud_pct?: number | null;
  download_url?: string;
}

export interface ZipProgressInfo {
  status: "pending" | "processing" | "ready" | "failed";
  progress_pct: number;
  message: string;
  download_url?: string;
  size_mb?: number;
  total_scenes?: number;
}

// ---------------------------------------------------------------------------
// WebSocket messages (server → client)
// ---------------------------------------------------------------------------

export interface StatusMessage {
  type: "status";
  message: string;
}

export interface ResultPayload {
  type: "result";
  optical_url?: string | null;
  sar_url?: string | null;
  optical_download_url?: string | null;
  sar_download_url?: string | null;
  optical_error?: string | null;
  sar_error?: string | null;
  aoi_bounds?: [number, number][];
  mode?: RetrievalMode;
  optical_timestamp?: string | null;
  sar_timestamp?: string | null;
  zip_status?: "pending" | "processing" | "ready" | "failed";
  zip_url?: string | null;
  zip_size_mb?: number | null;
  total_scenes?: number | null;
  scenes?: SceneMetadata[];
}

export interface ZipProgressMessage {
  type: "zip_progress";
  job_id: string;
  status: "processing" | "ready" | "failed";
  progress_pct: number;
  message: string;
  download_url?: string;
  size_mb?: number;
  total_scenes?: number;
}

export interface ErrorPayload {
  type: "error";
  message: string;
}

export type WsMessage = StatusMessage | ResultPayload | ErrorPayload | ZipProgressMessage;

// ---------------------------------------------------------------------------
// AOI processing hook state
// ---------------------------------------------------------------------------

export interface ProcessingState {
  appState: AppState;
  aoiGeometry: AoiGeometry | null;
  aoiAreaKm2: number | null;
  statusMessages: string[];
  result: ResultPayload | null;
  errorMessage: string | null;
  maxAoiAreaKm2: number;
  minAoiAreaKm2: number;
  dateStart: string | null;
  dateEnd: string | null;
  mode: RetrievalMode;
  zipProgress: ZipProgressInfo | null;
}
