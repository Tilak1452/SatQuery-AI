import { useRef, useState, useEffect } from "react";
import { Satellite, ArrowLeft } from "lucide-react";
import type { MapRef } from "react-map-gl/mapbox";
import MapView from "./components/MapView";
import ActionBar from "./components/ActionBar";
import LoadingScreen from "./components/LoadingScreen";
import ResultsPanel from "./components/ResultsPanel";
import SearchBar from "./components/SearchBar";
import LandingPage from "./components/LandingPage";
import { useAoiProcessing } from "./hooks/useAoiProcessing";
import type { RetrievalMode } from "./types";

type ActiveView = "landing" | "studio";

export default function App() {
  const mapRef = useRef<MapRef>(null);

  // Initialize view from URL hash, default to "landing"
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    return window.location.hash === "#studio" ? "studio" : "landing";
  });

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

  // Synchronize hash with view navigation and handle browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#studio") {
        setActiveView("studio");
      } else {
        setActiveView("landing");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = (view: ActiveView) => {
    setActiveView(view);
    if (view === "studio") {
      window.location.hash = "#studio";
      // Resize map after switching so WebGL dimensions adjust properly
      setTimeout(() => {
        mapRef.current?.resize();
      }, 60);
    } else {
      window.location.hash = "#landing";
    }
  };

  const handleLaunchStudio = (chosenMode?: RetrievalMode) => {
    if (chosenMode) {
      setMode(chosenMode);
    }
    navigateTo("studio");
  };

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
    <div className="relative w-full h-full bg-surface-0 overflow-hidden">
      {/* ── Landing Page View ── */}
      <div
        className={`w-full h-full ${
          activeView === "landing" ? "block" : "hidden"
        }`}
      >
        <LandingPage
          onLaunchStudio={handleLaunchStudio}
          hasActiveAoi={!!aoi}
          hasResults={appState === "results_ready"}
        />
      </div>

      {/* ── Extractor Studio Map View ── */}
      <div
        className={`relative w-full h-full ${
          activeView === "studio" ? "block" : "hidden"
        }`}
      >
        {/* ── Brand Header & Search ── */}
        <div className="brand-header">
          {/* Back button to return to Landing Page */}
          <button
            type="button"
            onClick={() => navigateTo("landing")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2/90 hover:bg-surface-3 border border-white/[0.08] hover:border-emerald-500/30 text-xs text-slate-300 hover:text-white transition-all duration-200 group mr-1 shadow-sm shrink-0 cursor-pointer"
            title="Back to Landing Page & Operational Guide"
          >
            <ArrowLeft
              size={14}
              className="text-slate-400 group-hover:text-emerald-400 group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="font-medium hidden sm:inline">Guide</span>
          </button>

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
    </div>
  );
}
