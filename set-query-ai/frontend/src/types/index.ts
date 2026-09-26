/**
 * Shared TypeScript types for Set Query AI.
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
}

export interface ErrorPayload {
  type: "error";
  message: string;
}

export type WsMessage = StatusMessage | ResultPayload | ErrorPayload;

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
}
