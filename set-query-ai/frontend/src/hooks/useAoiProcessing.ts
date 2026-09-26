/**
 * useAoiProcessing — Central state machine + WebSocket lifecycle.
 *
 * Manages the full flow: idle → aoi_selected → processing → results_ready | error
 * Fetches server config on mount for DRY AOI area validation.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  AoiGeometry,
  ProcessingState,
  ResultPayload,
  WsMessage,
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
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [state, setState] = useState<ProcessingState>({
    appState: "idle",
    aoiGeometry: null,
    aoiAreaKm2: null,
    statusMessages: [],
    result: null,
    errorMessage: null,
    maxAoiAreaKm2: 250, // default fallback; overwritten by server config
    minAoiAreaKm2: 1.0, // default fallback
    dateStart: null,
    dateEnd: null,
  });

  const wsRef = useRef<WebSocket | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch server config on mount (single source of truth for max area)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // AOI selection
  // ---------------------------------------------------------------------------
  const setAoi = useCallback((geometry: AoiGeometry | null) => {
    if (!geometry) {
      setState((s) => ({
        ...s,
        appState: "idle",
        aoiGeometry: null,
        aoiAreaKm2: null,
        errorMessage: null,
        dateStart: s.dateStart,
        dateEnd: s.dateEnd,
      }));
      return;
    }

    const area = computeAreaKm2(geometry);

    // Use functional setState so we always read the latest max/min from state
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
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Submit AOI + open WebSocket
  // ---------------------------------------------------------------------------
  const submitAoi = useCallback(async () => {
    if (!state.aoiGeometry) return;

    setState((s) => ({
      ...s,
      appState: "processing",
      statusMessages: [],
      result: null,
      errorMessage: null,
    }));

    try {
      // POST the AOI to get a job_id
      const res = await fetch(`${API_BASE}/api/aoi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          geometry: state.aoiGeometry,
          date_start: state.dateStart || undefined,
          date_end: state.dateEnd || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to submit AOI");
      }

      const { job_id } = await res.json();

      // Open WebSocket for streaming status
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
            }));
            break;

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
  }, [state.aoiGeometry, state.dateStart, state.dateEnd]);

  // ---------------------------------------------------------------------------
  // Custom Image Upload
  // ---------------------------------------------------------------------------
  const uploadImage = useCallback(async (file: File) => {
    setState((s) => ({
      ...s,
      appState: "processing",
      statusMessages: ["Uploading custom image..."],
      result: null,
      errorMessage: null,
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

  // ---------------------------------------------------------------------------
  // Reset (start over)
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    // Close any open WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState({
      appState: "idle",
      aoiGeometry: null,
      aoiAreaKm2: null,
      statusMessages: [],
      result: null,
      errorMessage: null,
      maxAoiAreaKm2: state.maxAoiAreaKm2, // preserve server config
      minAoiAreaKm2: state.minAoiAreaKm2,
      dateStart: state.dateStart, // preserve dates across reset
      dateEnd: state.dateEnd,
    });
  }, [state.maxAoiAreaKm2, state.dateStart, state.dateEnd]);

  // Cleanup on unmount
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
    submitAoi,
    uploadImage,
    reset,
  };
}
