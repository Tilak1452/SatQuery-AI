/**
 * App.tsx — Root component for SatQuery AI.
 *
 * Composes MapView, ActionBar, LoadingScreen, ResultsPanel, and SearchBar
 * using state from the useAoiProcessing hook.
 */

import { useRef } from "react";
import { Satellite } from "lucide-react";
import type { MapRef } from "react-map-gl/mapbox";
import MapView from "./components/MapView";
import ActionBar from "./components/ActionBar";
import LoadingScreen from "./components/LoadingScreen";
import ResultsPanel from "./components/ResultsPanel";
import SearchBar from "./components/SearchBar";
import { useAoiProcessing } from "./hooks/useAoiProcessing";

export default function App() {
  const mapRef = useRef<MapRef>(null);

  const {
    appState,
    aoiGeometry: aoi,
    aoiAreaKm2,
    maxAoiAreaKm2,
    statusMessages,
    result,
    errorMessage,
    dateStart,
    dateEnd,
    mode,
    zipProgress,
    setAoi,
    setDateStart,
    setDateEnd,
    setMode,
    submitAoi,
    reset,
  } = useAoiProcessing();

  const handleLocationSelect = (selectedResult: any) => {
    if (!mapRef.current) return;

    if (selectedResult.geometry) {
      setAoi(selectedResult.geometry);
      const coords = selectedResult.geometry.coordinates[0];
      const minLng = Math.min(...coords.map((c: any) => c[0]));
      const maxLng = Math.max(...coords.map((c: any) => c[0]));
      const minLat = Math.min(...coords.map((c: any) => c[1]));
      const maxLat = Math.max(...coords.map((c: any) => c[1]));

      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 100, duration: 1500 }
      );
    } else if (selectedResult.bbox) {
      const [minLng, minLat, maxLng, maxLat] = selectedResult.bbox;
      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 100, duration: 1500 }
      );
    } else {
      mapRef.current.flyTo({
        center: selectedResult.center,
        zoom: 14,
        duration: 1500,
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-surface-0">
      {/* ── Brand Header & Search ── */}
      <div className="brand-header">
        <div className="flex items-center gap-3 pr-4 border-r border-white/[0.06] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center border border-emerald-500/20">
            <Satellite size={16} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none tracking-tight">
              SatQuery
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent ml-1">
                AI
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium tracking-wider uppercase">
              Satellite Intelligence
            </p>
          </div>
        </div>
        <SearchBar
          onLocationSelect={handleLocationSelect}
          maxAoiAreaKm2={maxAoiAreaKm2}
        />
      </div>

      {/* ── Full-viewport map ── */}
      <MapView
        appState={appState}
        aoi={aoi}
        mapRef={mapRef}
        onAoiChange={setAoi}
      />

      {/* ── Loading Screen (visible during initial processing) ── */}
      <LoadingScreen
        messages={statusMessages}
        visible={appState === "processing"}
      />

      {/* ── Results panel (visible when results are ready) ── */}
      <ResultsPanel
        result={result}
        zipProgress={zipProgress}
        visible={appState === "results_ready"}
        onClose={reset}
      />

      {/* ── Action bar (always visible, adapts to state) ── */}
      <ActionBar
        appState={appState}
        aoiAreaKm2={aoiAreaKm2}
        maxAoiAreaKm2={maxAoiAreaKm2}
        errorMessage={errorMessage}
        dateStart={dateStart}
        dateEnd={dateEnd}
        mode={mode}
        onModeChange={setMode}
        onDateStartChange={setDateStart}
        onDateEndChange={setDateEnd}
        onSubmit={submitAoi}
        onClear={() => setAoi(null)}
        onReset={reset}
      />
    </div>
  );
}
