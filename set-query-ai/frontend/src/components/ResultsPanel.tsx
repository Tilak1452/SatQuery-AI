/**
 * ResultsPanel — Cinematic satellite imagery display.
 *
 * Features:
 * - Staggered card entrance animations
 * - Metadata ribbon overlay on hover
 * - Download buttons with glow
 * - Close button with rotate-on-hover
 */

import { Download, Satellite, Radio, X } from "lucide-react";
import type { ResultPayload } from "../types";

interface ResultsPanelProps {
  result: ResultPayload | null;
  visible: boolean;
  onClose: () => void;
}

export default function ResultsPanel({ result, visible, onClose }: ResultsPanelProps) {
  if (!visible || !result) return null;

  return (
    <div className="results-panel" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2.5 rounded-xl z-50 map-tool-btn group"
        title="Close results"
      >
        <X size={18} className="transition-transform duration-300 group-hover:rotate-90" />
      </button>

      <div className="results-grid">
        {/* ── Optical Image ── */}
        <div className="result-card">
          <div className="result-card-header">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Satellite size={13} className="text-emerald-400" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider block leading-none">
                  Optical
                </span>
                <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                  SENTINEL-2 · RGB
                </span>
              </div>
            </div>
            {result.optical_url && (
              <a
                href={result.optical_download_url || result.optical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon hover:text-emerald-400 hover:bg-emerald-500/10"
                title="Download optical GeoTIFF"
                id="btn-download-optical"
              >
                <Download size={14} />
              </a>
            )}
          </div>
          {result.optical_url ? (
            <div className="result-image-container">
              <img
                src={result.optical_url}
                alt="Sentinel-2 optical RGB imagery"
                className="result-image"
                loading="lazy"
              />
              <div className="result-metadata-ribbon">
                <span>10m · SURFACE REFLECTANCE</span>
                <span className="text-emerald-400">B4 / B3 / B2</span>
              </div>
            </div>
          ) : (
            <div className="result-image-container flex flex-col items-center justify-center p-6 text-center bg-slate-900/60 min-h-[220px]">
              <Satellite size={28} className="text-slate-600 mb-2" />
              <span className="text-xs font-medium text-slate-300 mb-1">Optical Imagery Unavailable</span>
              <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed">
                {result.optical_error || "Sentinel-2 only monitors land and coastal zones within ~20 km of shore. No optical coverage found."}
              </p>
            </div>
          )}
        </div>

        {/* ── SAR Image ── */}
        {result.sar_url && (
          <div className="result-card">
            <div className="result-card-header">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Radio size={13} className="text-amber-400" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider block leading-none">
                    SAR
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                    SENTINEL-1 · VV/VH
                  </span>
                </div>
              </div>
              <a
                href={result.sar_download_url || result.sar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon hover:text-amber-400 hover:bg-amber-500/10"
                title="Download SAR GeoTIFF"
                id="btn-download-sar"
              >
                <Download size={14} />
              </a>
            </div>
            <div className="result-image-container">
              <img
                src={result.sar_url}
                alt="Sentinel-1 SAR backscatter composite"
                className="result-image"
                loading="lazy"
              />
              <div className="result-metadata-ribbon">
                <span>10m · GRD BACKSCATTER</span>
                <span className="text-amber-400">VV + VH</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
