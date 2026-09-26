/**
 * useAoiProcessing — Central state machine + WebSocket lifecycle.
 *
 * Manages the full flow: idle → aoi_selected → processing → results_ready | error
 * Supports both Cloud-Free Composite mode and Multi-Scene Time-Series mode.
 * Streams real-time ZIP dataset packaging in the background while displaying immediate previews.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  AoiGeometry,
  ProcessingState,
  ResultPayload,
  RetrievalMode,
  WsMessage,
  ZipProgressMessage,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

/**
 * Approximate area of a GeoJSON polygon in km² (client-side validation).
 * Uses the Shoelace formula with latitude correction.
 */
function computeAreaKm2(geometry: AoiGeometry): number {
  const coords =
    geometry.type === "MultiPolygon"
      ? (geometry.coordinates as number[][][][]).flatMap((p) => p[0])
      : (geometry.coordinates as number[][][])[0];

  if (!coords || coords.length < 3) return 0;

  let areaDeg2 = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaDeg2 += coords[i][0] * coords[j][1];
    areaDeg2 -= coords[j][0] * coords[i][1];
  }
  areaDeg2 = Math.abs(areaDeg2) / 2;

  const meanLat = coords.reduce((s, c) => s + c[1], 0) / n;
  const latRad = (meanLat * Math.PI) / 180;
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos(latRad);

  return areaDeg2 * kmPerDegLat * kmPerDegLon;
}

export function useAoiProcessing() {
  const [state, setState] = useState<ProcessingState>({
    appState: "idle",
    aoiGeometry: null,
    aoiAreaKm2: null,
    statusMessages: [],
    result: null,
    errorMessage: null,
    maxAoiAreaKm2: 250,
    minAoiAreaKm2: 1.0,
    dateStart: null,
    dateEnd: null,
    mode: "composite",
    zipProgress: null,
  });

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch server config on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/config`)
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.max_aoi_area_km2) {
          setState((s) => ({ ...s, maxAoiAreaKm2: cfg.max_aoi_area_km2 }));
        }
        if (cfg.min_aoi_area_km2) {
          setState((s) => ({ ...s, minAoiAreaKm2: cfg.min_aoi_area_km2 }));
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch server config, using defaults:", err);
      });
  }, []);

  // Set AOI Geometry with area validation
  const setAoi = useCallback((geometry: AoiGeometry | null) => {
    if (!geometry) {
      setState((s) => ({
        ...s,
        appState: "idle",
        aoiGeometry: null,
        aoiAreaKm2: null,
        errorMessage: null,
        zipProgress: null,
      }));
      return;
    }

    const area = computeAreaKm2(geometry);

    setState((s) => {
      if (area > s.maxAoiAreaKm2) {
        return {
          ...s,
          appState: "error",
          aoiGeometry: geometry,
          aoiAreaKm2: area,
          errorMessage: `AOI area (${area.toFixed(1)} km²) exceeds the maximum allowed area (${s.maxAoiAreaKm2} km²). Please draw a smaller region.`,
        };
      }

      if (area < s.minAoiAreaKm2) {
        return {
          ...s,
          appState: "error",
          aoiGeometry: geometry,
          aoiAreaKm2: area,
          errorMessage: `AOI area (${area.toFixed(2)} km²) is below the minimum required area (${s.minAoiAreaKm2} km²). Sentinel's 10m native resolution cannot render detailed images for areas this small.`,
        };
      }

      return {
        ...s,
        appState: "aoi_selected",
        aoiGeometry: geometry,
        aoiAreaKm2: area,
        errorMessage: null,
        statusMessages: [],
        result: null,
        zipProgress: null,
      };
    });
  }, []);

  // Submit AOI + open WebSocket
  const submitAoi = useCallback(async () => {
    if (!state.aoiGeometry) return;

    setState((s) => ({
      ...s,
      appState: "processing",
      statusMessages: [],
      result: null,
      errorMessage: null,
      zipProgress: null,
    }));

    try {
      const res = await fetch(`${API_BASE}/api/aoi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          geometry: state.aoiGeometry,
          date_start: state.dateStart || undefined,
          date_end: state.dateEnd || undefined,
          mode: state.mode,
          max_scenes: state.mode === "timeseries" ? 12 : 2,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to submit AOI");
      }

      const { job_id } = await res.json();

      const ws = new WebSocket(`${WS_BASE}/ws/process/${job_id}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg: WsMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "status":
            setState((s) => ({
              ...s,
              statusMessages: [...s.statusMessages, msg.message],
            }));
            break;

          case "result":
            setState((s) => ({
              ...s,
              appState: "results_ready",
              result: msg as ResultPayload,
              zipProgress: {
                status: "processing",
                progress_pct: 10,
                message: "Harvesting & packaging GeoTIFF dataset in background...",
              },
            }));
            break;

          case "zip_progress": {
            const zMsg = msg as ZipProgressMessage;
            setState((s) => {
              const updatedResult = s.result
                ? {
                    ...s.result,
                    zip_status: zMsg.status,
                    zip_url: zMsg.download_url || s.result.zip_url,
                    zip_size_mb: zMsg.size_mb || s.result.zip_size_mb,
                    total_scenes: zMsg.total_scenes || s.result.total_scenes,
                  }
                : null;

              return {
                ...s,
                result: updatedResult,
                zipProgress: {
                  status: zMsg.status,
                  progress_pct: zMsg.progress_pct,
                  message: zMsg.message,
                  download_url: zMsg.download_url,
                  size_mb: zMsg.size_mb,
                  total_scenes: zMsg.total_scenes,
                },
              };
            });
            break;
          }

          case "error":
            setState((s) => ({
              ...s,
              appState: "error",
              errorMessage: msg.message,
            }));
            break;
        }
      };

      ws.onerror = () => {
        setState((s) => ({
          ...s,
          appState: "error",
          errorMessage: "WebSocket connection failed. Please try again.",
        }));
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (err: any) {
      const msg =
        err?.message === "Failed to fetch"
          ? `Cannot reach backend at ${API_BASE}. Please ensure the FastAPI server is running.`
          : err.message || "An unexpected error occurred.";
      setState((s) => ({
        ...s,
        appState: "error",
        errorMessage: msg,
      }));
    }
  }, [state.aoiGeometry, state.dateStart, state.dateEnd, state.mode]);

  // Upload Custom Image
  const uploadImage = useCallback(async (file: File) => {
    setState((s) => ({
      ...s,
      appState: "processing",
      statusMessages: ["Uploading custom image..."],
      result: null,
      errorMessage: null,
      zipProgress: null,
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to upload image");
      }

      const resultPayload: ResultPayload = await res.json();
      
      setState((s) => ({
        ...s,
        appState: "results_ready",
        result: resultPayload,
      }));
    } catch (err: any) {
      setState((s) => ({
        ...s,
        appState: "error",
        errorMessage: err.message || "An unexpected error occurred during upload.",
      }));
    }
  }, []);

  // Reset
  const reset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState((s) => ({
      appState: "idle",
      aoiGeometry: null,
      aoiAreaKm2: null,
      statusMessages: [],
      result: null,
      errorMessage: null,
      maxAoiAreaKm2: s.maxAoiAreaKm2,
      minAoiAreaKm2: s.minAoiAreaKm2,
      dateStart: s.dateStart,
      dateEnd: s.dateEnd,
      mode: s.mode,
      zipProgress: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    setAoi,
    setDateStart: (date: string | null) => setState((s) => ({ ...s, dateStart: date })),
    setDateEnd: (date: string | null) => setState((s) => ({ ...s, dateEnd: date })),
    setMode: (mode: RetrievalMode) => setState((s) => ({ ...s, mode })),
    submitAoi,
    uploadImage,
    reset,
  };
}
