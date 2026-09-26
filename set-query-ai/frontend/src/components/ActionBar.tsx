/**
 * ActionBar — Premium floating command bar.
 *
 * Adapts its content to the current app state with smooth transitions.
 * Features gradient borders, refined date inputs, shimmer buttons,
 * and animated area badges.
 */

import { useRef } from "react";
import {
  Crosshair,
  Send,
  Trash2,
  RotateCcw,
  Loader2,
  AlertCircle,
  Upload,
} from "lucide-react";
import type { AppState } from "../types";

interface ActionBarProps {
  appState: AppState;
  aoiAreaKm2: number | null;
  maxAoiAreaKm2: number;
  errorMessage: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  onDateStartChange: (val: string | null) => void;
  onDateEndChange: (val: string | null) => void;
  onSubmit: () => void;
  onUploadImage: (file: File) => void;
  onClear: () => void;
  onReset: () => void;
}

export default function ActionBar({
  appState,
  aoiAreaKm2,
  maxAoiAreaKm2,
  errorMessage,
  dateStart,
  dateEnd,
  onDateStartChange,
  onDateEndChange,
  onSubmit,
  onUploadImage,
  onClear,
  onReset,
}: ActionBarProps) {
  const today = new Date().toISOString().split("T")[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadImage(e.target.files[0]);
    }
  };

  return (
    <div
      className="action-bar"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        opacity: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* idle */}
      {appState === "idle" && (
        <div className="flex items-center gap-3 sm:gap-4 animate-fade-in flex-wrap justify-center">
          <div className="flex items-center gap-2.5 text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Crosshair size={14} className="text-cyan-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-300">
              Draw a polygon on the map to select your area of interest
            </span>
          </div>

          <div className="hidden sm:block w-px h-6 bg-white/[0.06]" />

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            title="Upload Custom Image"
          >
            <Upload size={14} />
            <span className="text-xs sm:text-sm">Upload Image</span>
          </button>
        </div>
      )}

      {/* aoi_selected */}
      {appState === "aoi_selected" && (
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center animate-fade-in">
          {aoiAreaKm2 !== null && (
            <span className="badge-area shrink-0">
              {aoiAreaKm2.toFixed(1)} km²
              <span className="text-emerald-600 mx-1">/</span>
              <span className="text-slate-500">{maxAoiAreaKm2}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2">
            <input
              type="date"
              max={today}
              className="input-dark w-[125px] sm:w-[130px] text-xs sm:text-sm"
              value={dateStart || ""}
              onChange={(e) => onDateStartChange(e.target.value || null)}
              title="Start Date"
            />
            <span className="text-slate-600 text-xs font-mono">→</span>
            <input
              type="date"
              max={today}
              className="input-dark w-[125px] sm:w-[130px] text-xs sm:text-sm"
              value={dateEnd || ""}
              onChange={(e) => onDateEndChange(e.target.value || null)}
              title="End Date"
            />
          </div>

          <button
            onClick={onSubmit}
            className="btn-primary"
            id="btn-get-imagery"
          >
            <Send size={14} />
            Get Imagery
          </button>

          <button
            onClick={onClear}
            className="btn-secondary border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-slate-300 hover:text-red-300"
            id="btn-clear-aoi"
            title="Clear Selected Area"
          >
            <Trash2 size={14} className="text-red-400" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* processing */}
      {appState === "processing" && (
        <div className="flex items-center gap-3 text-slate-400 animate-fade-in">
          <Loader2 size={16} className="animate-spin text-emerald-400" />
          <span className="text-xs sm:text-sm font-medium font-mono tracking-wide text-slate-300">
            Processing satellite imagery…
          </span>
        </div>
      )}

      {/* results_ready */}
      {appState === "results_ready" && (
        <button
          onClick={onReset}
          className="btn-secondary animate-fade-in"
          id="btn-start-over"
        >
          <RotateCcw size={14} />
          Start Over
        </button>
      )}

      {/* error */}
      {appState === "error" && (
        <div className="flex items-center gap-3 flex-wrap justify-center animate-fade-in">
          <div className="flex items-center gap-2 text-red-400/90 text-sm max-w-lg">
            <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center shrink-0">
              <AlertCircle size={13} />
            </div>
            <span className="line-clamp-2 leading-tight text-slate-300 text-xs sm:text-sm">
              {errorMessage}
            </span>
          </div>
          <button
            onClick={onClear}
            className="btn-secondary border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-slate-300 hover:text-red-300"
            id="btn-retry"
          >
            <Trash2 size={14} className="text-red-400" />
            <span>Clear & Retry</span>
          </button>
        </div>
      )}
    </div>
  );
}
