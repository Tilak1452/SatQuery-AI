/**
 * ResultsPanel — Cinematic satellite imagery display and dataset download center.
 *
 * Features:
 * - Instant high-resolution Optical and SAR previews while background harvesting occurs
 * - Dedicated Time-Series Dataset (.ZIP) downloader with real-time progress
 * - Exact ISO-8601 UTC timestamp extraction & display
 * - Interactive timestamp interpretation guide for judges & researchers
 * - Strict 10m GeoTIFF (.tif) preservation
 */

import { useState } from "react";
import {
  Download,
  Satellite,
  Radio,
  X,
  Archive,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { ResultPayload, ZipProgressInfo } from "../types";

interface ResultsPanelProps {
  result: ResultPayload | null;
  zipProgress: ZipProgressInfo | null;
  visible: boolean;
  onClose: () => void;
}

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE}${path}`;
}

export default function ResultsPanel({
  result,
  zipProgress,
  visible,
  onClose,
}: ResultsPanelProps) {
  const [guideExpanded, setGuideExpanded] = useState(true);

  if (!visible || !result) return null;

  const isZipReady =
    zipProgress?.status === "ready" ||
    (result.zip_url !== null && result.zip_url !== undefined);
  const rawDownloadPath = result.zip_url || zipProgress?.download_url || null;
  const zipDownloadUrl = resolveUrl(rawDownloadPath);

  const zipSizeMb = zipProgress?.size_mb || result.zip_size_mb || 0;
  const totalScenes = zipProgress?.total_scenes || result.total_scenes || (result.mode === "timeseries" ? 12 : 2);
  const progressPct = zipProgress?.progress_pct || (isZipReady ? 100 : 15);

  return (
    <div
      className="results-panel"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2.5 rounded-xl z-50 map-tool-btn group"
        title="Close results"
      >
        <X size={18} className="transition-transform duration-300 group-hover:rotate-90" />
      </button>

      <div className="results-grid">
        {/* ── Top Header Ribbon ── */}
        <div className="col-span-1 md:col-span-2 flex items-center justify-between pb-3 border-b border-white/[0.08] flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Satellite size={16} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Satellite Intelligence Previews</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {result.mode === "timeseries" ? "TIME-SERIES STACK" : "CLOUD-FREE COMPOSITE"}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Immediate high-resolution preview loaded. Full 10m GeoTIFF dataset packaging below.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-emerald-400" />
              UTC Timestamps Embedded
            </span>
          </div>
        </div>

        {/* ── Optical Image Card ── */}
        <div className="result-card">
          <div className="result-card-header">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Satellite size={13} className="text-emerald-400" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider block leading-none">
                  Optical Surface Reflectance
                </span>
                <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                  SENTINEL-2 · RGB (B4, B3, B2)
                </span>
              </div>
            </div>
            {result.optical_timestamp && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {result.optical_timestamp.replace("T", " ").replace("Z", " UTC")}
              </span>
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
                <span>10m · GeoTIFF COMPATIBLE</span>
                <span className="text-emerald-400 font-mono font-medium">
                  {result.optical_timestamp || "L2A BOA Reflectance"}
                </span>
              </div>
            </div>
          ) : (
            <div className="result-image-container flex flex-col items-center justify-center p-6 text-center bg-slate-900/60 min-h-[220px]">
              <Satellite size={28} className="text-slate-600 mb-2" />
              <span className="text-xs font-medium text-slate-300 mb-1">
                Optical Imagery Unavailable
              </span>
              <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed">
                {result.optical_error ||
                  "Sentinel-2 monitors land and coastal zones. No optical coverage found."}
              </p>
            </div>
          )}
        </div>

        {/* ── SAR Image Card ── */}
        <div className="result-card">
          <div className="result-card-header">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Radio size={13} className="text-amber-400" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider block leading-none">
                  SAR Radar Backscatter
                </span>
                <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                  SENTINEL-1 · C-BAND VV
                </span>
              </div>
            </div>
            {result.sar_timestamp && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {result.sar_timestamp.replace("T", " ").replace("Z", " UTC")}
              </span>
            )}
          </div>

          {result.sar_url ? (
            <div className="result-image-container">
              <img
                src={result.sar_url}
                alt="Sentinel-1 SAR backscatter"
                className="result-image"
                loading="lazy"
              />
              <div className="result-metadata-ribbon">
                <span>10m · ALL-WEATHER PENETRATION</span>
                <span className="text-amber-400 font-mono font-medium">
                  {result.sar_timestamp || "GRD C-Band"}
                </span>
              </div>
            </div>
          ) : (
            <div className="result-image-container flex flex-col items-center justify-center p-6 text-center bg-slate-900/60 min-h-[220px]">
              <Radio size={28} className="text-slate-600 mb-2" />
              <span className="text-xs font-medium text-slate-300 mb-1">
                SAR Imagery Unavailable
              </span>
              <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed">
                {result.sar_error || "No Sentinel-1 pass found for the selected time window."}
              </p>
            </div>
          )}
        </div>

        {/* ── Background Dataset ZIP Packaging & Download Center ── */}
        <div className="col-span-1 md:col-span-2 glass-card p-5 border border-emerald-500/30 bg-slate-900/70">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Archive size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Complete Multi-Temporal GeoTIFF Dataset (.ZIP)</span>
                  {isZipReady && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 size={11} /> READY
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full-resolution 10m GeoTIFFs strictly named with ISO timestamps for AI models & GIS.
                </p>
              </div>
            </div>

            {/* Main Action Button */}
            <div>
              {isZipReady && zipDownloadUrl ? (
                <a
                  href={zipDownloadUrl}
                  download
                  className="btn-primary text-sm font-semibold px-5 py-2.5 flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  id="btn-download-dataset-zip"
                >
                  <Download size={16} />
                  <span>Download Dataset ZIP</span>
                  <span className="text-xs font-mono opacity-80 ml-1">
                    ({totalScenes} TIFs{zipSizeMb > 0 ? ` · ${zipSizeMb} MB` : ""})
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300 text-xs">
                  <Loader2 size={14} className="animate-spin text-cyan-400" />
                  <span>Packaging in background ({progressPct}%)</span>
                </div>
              )}
            </div>
          </div>

          {/* Background Progress Bar */}
          {!isZipReady && (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
                <span>{zipProgress?.message || "Harvesting GeoTIFF scenes from Google Earth Engine..."}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Timestamp & Filename Interpretation Guide (Requested by User) ── */}
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <button
              onClick={() => setGuideExpanded(!guideExpanded)}
              className="flex items-center justify-between w-full text-left text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
                <Info size={13} />
                <span>Timestamp Extraction Guide & File Naming Conventions</span>
              </div>
              {guideExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {guideExpanded && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.06] text-xs font-mono space-y-2 text-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 pb-2 border-b border-white/[0.06]">
                  <span className="font-semibold text-slate-200">Standardized Filename Format:</span>
                  <code className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    SatQuery_[Sensor]_[Modality]_[YYYYMMDD]_[THHMMSSZ].tif
                  </code>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-emerald-400 font-bold block mb-1">
                      Sentinel-2 Optical Example:
                    </span>
                    <p className="text-slate-200 font-semibold">
                      SatQuery_S2_Optical_20230615_T103021Z.tif
                    </p>
                    <p className="text-slate-400 mt-1 text-[10px]">
                      → Captured: <strong>June 15, 2023 at 10:30:21 UTC</strong>
                      <br />→ Surface Reflectance (RGB Bands 4, 3, 2)
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-amber-400 font-bold block mb-1">
                      Sentinel-1 SAR Radar Example:
                    </span>
                    <p className="text-slate-200 font-semibold">
                      SatQuery_S1_SAR_VV_20230616_T174512Z.tif
                    </p>
                    <p className="text-slate-400 mt-1 text-[10px]">
                      → Captured: <strong>June 16, 2023 at 17:45:12 UTC</strong>
                      <br />→ C-Band Radar VV Backscatter (All-Weather)
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-400 leading-relaxed border-t border-white/[0.04] flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0 font-bold">Chronological Sorting:</span>
                  <span>
                    Because ISO timestamps use standard descending time elements (Year → Month → Day → Hour → Min → Sec),
                    sorting files alphabetically (A-Z) in any operating system or AI DataLoader automatically orders scenes from earliest (T₁) to latest (T<sub>n</sub>).
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
