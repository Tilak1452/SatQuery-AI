/**
 * LandingPage.tsx — Premium Landing Page & Operational Guide for SatQuery AI.
 *
 * Explains:
 * 1. How to create an AOI (Drawing Polygon or Search/Coordinates/GeoJSON) within 1-250 km².
 * 2. How to input observation dates (Start & End Date window).
 * 3. How the Single-Pair Image (Cloud-Free Composite) option works.
 * 4. How the Multi-Scene Time-Series Stack option works.
 * 5. How to launch the extraction studio and return anytime via the Back button.
 */

import React, { useState } from "react";
import {
  Satellite,
  Layers,
  Clock,
  Calendar,
  Compass,
  Download,
  ArrowRight,
  ShieldCheck,
  Radio,
  FileArchive,
  CheckCircle2,
  Sparkles,
  Zap,
  MapPin,
  ExternalLink,
  ChevronRight,
  Search,
  Maximize2,
  Cpu,
  Eye,
  Info,
} from "lucide-react";
import type { RetrievalMode } from "../types";

interface LandingPageProps {
  onLaunchStudio: (mode?: RetrievalMode) => void;
  hasActiveAoi?: boolean;
  hasResults?: boolean;
}

export default function LandingPage({
  onLaunchStudio,
  hasActiveAoi = false,
  hasResults = false,
}: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<"all" | "single" | "timeseries">("all");
  const [activeStep, setActiveStep] = useState<number>(1);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-surface-0 text-slate-100 overflow-y-auto custom-scrollbar select-none">
      {/* ── Background Glow & Grid Accents ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-0 w-[550px] h-[450px] bg-teal-500/10 rounded-full blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-surface-0/80 border-b border-white/[0.06] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Satellite size={18} className="text-emerald-400" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                SatQuery
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-extrabold">
                  AI
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider ml-1">
                  v0.2.0
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Satellite Intelligence & GeoTIFF Extractor
              </p>
            </div>
          </div>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection("workflow")}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("modes")}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Extraction Modes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("specs")}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Sensor Specs
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("guide")}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Quick Reference
            </button>
          </nav>

          {/* Action Button to Launch Studio */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              GEE Engine Online
            </div>
            <button
              type="button"
              onClick={() => onLaunchStudio()}
              className="relative group px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center gap-1.5"
            >
              <span>{hasActiveAoi ? "Resume Studio" : "Launch Extractor"}</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Landing Body ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 space-y-20">
        {/* ── 1. Hero Section ── */}
        <section className="text-center pt-8 sm:pt-14 pb-4 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2/90 border border-emerald-500/30 text-xs font-mono text-emerald-300 shadow-inner">
            <Radio size={13} className="text-emerald-400 animate-pulse" />
            <span>CLOUD-NATIVE EARTH ENGINE COPERNICUS HARVESTER</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Precision Satellite Imagery & <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Time-Series GeoTIFF Extraction
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
            Extract research-grade <strong>Sentinel-2 Optical (10m)</strong> and{" "}
            <strong>Sentinel-1 SAR Radar (10m)</strong> data directly from Google Earth Engine.
            Harvest single cloud-free composites or 20-scene temporal stacks, packaged cleanly into
            georeferenced GeoTIFFs and downloadable ZIP archives.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onLaunchStudio()}
              className="px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all duration-300 flex items-center gap-2 group cursor-pointer"
            >
              <Compass size={17} className="text-white group-hover:rotate-45 transition-transform duration-300" />
              <span>Open Interactive Extractor Map</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("workflow")}
              className="px-5 py-3.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-surface-2/80 hover:bg-surface-3 border border-white/[0.08] hover:border-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Info size={16} className="text-emerald-400" />
              <span>Read Operational Guide</span>
            </button>
          </div>

          {/* Key Feature Badges */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3 rounded-xl bg-surface-1/70 border border-white/[0.06] backdrop-blur flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-400">
                <Satellite size={14} />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white">Sentinel-2 L2A</div>
                <div className="text-[10px] text-slate-400">10m RGB Surface Refl.</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-1/70 border border-white/[0.06] backdrop-blur flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 text-cyan-400">
                <Radio size={14} />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white">Sentinel-1 GRD</div>
                <div className="text-[10px] text-slate-400">10m C-Band SAR (VV)</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-1/70 border border-white/[0.06] backdrop-blur flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0 text-teal-400">
                <ShieldCheck size={14} />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white">SCL Cloud Mask</div>
                <div className="text-[10px] text-slate-400">Clean Median Composite</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-1/70 border border-white/[0.06] backdrop-blur flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-400">
                <FileArchive size={14} />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white">ZIP Auto-Packager</div>
                <div className="text-[10px] text-slate-400">ISO-8601 UTC Files</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. How the Tool Works — 4-Step Operational Guide ── */}
        <section id="workflow" className="scroll-mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-400 font-semibold uppercase">
              <Sparkles size={12} />
              <span>Step-by-Step Instructions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How to Use the GeoTIFF Extractor
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Follow these simple steps inside the map studio to retrieve optical and radar imagery.
            </p>
          </div>

          {/* Interactive Steps Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Step 1: AOI Creation */}
            <div
              onClick={() => setActiveStep(1)}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                activeStep === 1
                  ? "bg-surface-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                  : "bg-surface-1/80 border-white/[0.06] hover:border-white/[0.15] hover:bg-surface-2/60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                    01
                  </span>
                  <span className="text-[10px] font-mono uppercase text-slate-400 px-2 py-0.5 rounded bg-surface-3">
                    Map Geometry
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Maximize2 size={15} className="text-emerald-400" />
                  Create AOI on the Map
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Draw a polygon on the map using the draw tool on the right toolbar, or search by city,
                  coordinates (<code className="text-[11px] text-emerald-300 font-mono">lat, lon</code>), or
                  paste raw GeoJSON/WKT into the top search bar.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] space-y-1.5">
                <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Size limit: 1.0 km² to 250.0 km²</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Live geodesic area calculation displays right on the action bar.
                </div>
              </div>
            </div>

            {/* Step 2: Date Input */}
            <div
              onClick={() => setActiveStep(2)}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                activeStep === 2
                  ? "bg-surface-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                  : "bg-surface-1/80 border-white/[0.06] hover:border-white/[0.15] hover:bg-surface-2/60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                    02
                  </span>
                  <span className="text-[10px] font-mono uppercase text-slate-400 px-2 py-0.5 rounded bg-surface-3">
                    Observation Range
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Calendar size={15} className="text-cyan-400" />
                  Input Observation Dates
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Select your desired <strong>Start Date</strong> and <strong>End Date</strong> in the floating
                  command bar. The engine automatically filters available Sentinel overpasses.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] space-y-1.5">
                <div className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Automated Lookback Protection</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Auto-expands backwards 90 days if cloud cover prevents clean optical data.
                </div>
              </div>
            </div>

            {/* Step 3: Mode Selection */}
            <div
              onClick={() => setActiveStep(3)}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                activeStep === 3
                  ? "bg-surface-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                  : "bg-surface-1/80 border-white/[0.06] hover:border-white/[0.15] hover:bg-surface-2/60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 font-mono font-bold text-xs flex items-center justify-center border border-teal-500/30">
                    03
                  </span>
                  <span className="text-[10px] font-mono uppercase text-slate-400 px-2 py-0.5 rounded bg-surface-3">
                    Retrieval Mode
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Layers size={15} className="text-teal-400" />
                  Choose Extraction Mode
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Toggle between <strong>Composite</strong> (clean single-pair baseline) and{" "}
                  <strong>Time-Series</strong> (multi-scene temporal stack) right in the action bar.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] space-y-1.5">
                <div className="text-[11px] text-teal-400 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Dual Processing Pipelines</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Fast single pair or up to 20 chronological GeoTIFF scenes in ZIP.
                </div>
              </div>
            </div>

            {/* Step 4: Extraction & Download */}
            <div
              onClick={() => setActiveStep(4)}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                activeStep === 4
                  ? "bg-surface-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                  : "bg-surface-1/80 border-white/[0.06] hover:border-white/[0.15] hover:bg-surface-2/60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
                    04
                  </span>
                  <span className="text-[10px] font-mono uppercase text-slate-400 px-2 py-0.5 rounded bg-surface-3">
                    Export & Delivery
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Download size={15} className="text-amber-400" />
                  Harvest & Download
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Click <strong>Get Imagery</strong>. Watch the live WebSocket telemetry stream, inspect
                  side-by-side HD previews, and download 10m GeoTIFFs or the compiled ZIP archive.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] space-y-1.5">
                <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Immediate HD Previews</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Direct GeoTIFF links + background ZIP packaging with live progress bar.
                </div>
              </div>
            </div>
          </div>

          {/* Deep-Dive Active Step Card */}
          <div className="p-6 rounded-2xl bg-surface-2 border border-white/[0.08] backdrop-blur space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  STEP 0{activeStep} DEEP DIVE
                </span>
                <span className="text-sm font-semibold text-white">
                  {activeStep === 1 && "Creating and Validating Your Area of Interest (AOI)"}
                  {activeStep === 2 && "Specifying Observation Timeframes & Lookback Mechanics"}
                  {activeStep === 3 && "Understanding Composite vs. Time-Series Retrieval"}
                  {activeStep === 4 && "WebSocket Telemetry, Preview Delivery & Packaging"}
                </span>
              </div>
              <div className="text-xs text-slate-400">Click steps 1-4 above to view instructions</div>
            </div>

            {activeStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-400" />
                    Option A: Draw Polygon on Map
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Click the polygon icon on the top-right toolbar. Click points on the map to define the perimeter.
                    Click the first vertex or double-click to close the polygon.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Search size={14} className="text-cyan-400" />
                    Option B: Location or Coords
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Type a city or region name to fly there, or enter coordinates like{" "}
                    <code className="text-emerald-300 font-mono">19.0760, 72.8777</code>. It instantly centers
                    the viewport and creates a sample AOI.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-teal-400" />
                    Area Constraint: 1 - 250 km²
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    If your AOI is under 1.0 km² or over 250.0 km², the action bar will turn amber/rose with a warning.
                    This cap ensures the 10m GeoTIFF export adheres to Earth Engine's 32 MB limit.
                  </p>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-cyan-400" />
                    Setting Date Limits
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    The floating action bar at the bottom contains interactive date fields. Pick a start date and an
                    end date. Defaults to the previous 30-60 days for freshest imagery.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-400" />
                    Automated Cloud Fallback
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    If your date range contains dense cloud cover, our algorithm relaxes cloud thresholds and
                    expands backwards by 90 days so you always receive valid, void-filled imagery.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Radio size={14} className="text-teal-400" />
                    SAR Temporal Coherence
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    In single composite mode, Sentinel-1 radar is matched within ±7 days of the optical acquisition
                    to ensure cross-modal temporal coherence.
                  </p>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-surface-1 border border-emerald-500/20 space-y-2">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Layers size={14} />
                    Composite Mode (Single-Pair Image)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Combines the top least-cloudy Sentinel-2 scenes into one statistically pure median composite.
                    Per-pixel SCL masking eliminates cloud shadows and transient clouds. Best for quick baseline
                    visual inspection and land cover mapping.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-surface-1 border border-teal-500/20 space-y-2">
                  <div className="font-semibold text-teal-400 flex items-center gap-1.5">
                    <Clock size={14} />
                    Time-Series Mode (Multi-Scene Stack)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Harvests up to 20 distinct satellite passes over time. Each scene retains its unique ISO-8601 UTC
                    timestamp and cloud percentage. Best for machine learning models, crop growth monitoring, and
                    change detection.
                  </p>
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Live WebSocket Telemetry
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    No blind waiting or page reloads. A cinematic HUD displays real-time execution steps directly
                    from Google Earth Engine as optical and radar bands are processed.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Eye size={14} className="text-emerald-400" />
                    Instant High-Definition Previews
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Results are delivered in 1024px HD directly to the Results Panel. You can inspect optical RGB and
                    radar backscatter side by side with coordinate bounds and metadata.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.04] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <FileArchive size={14} className="text-cyan-400" />
                    ZIP Dataset Packager
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    In time-series mode, scenes are harvested in the background. A live progress bar tracks ZIP archive
                    creation with an auto-generated dataset README and ISO-8601 filenames.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 3. Dual Modalities Comparison (Composite vs Time-Series) ── */}
        <section id="modes" className="scroll-mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[11px] font-mono text-cyan-400 font-semibold uppercase">
              <Layers size={12} />
              <span>Extraction Modalities</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Single-Pair Composite vs. Time-Series Stack
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              SatQuery AI provides two purpose-built retrieval pipelines configured for different remote sensing needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mode 1: Single-Pair Image (Composite) */}
            <div className="relative group p-6 sm:p-8 rounded-3xl bg-surface-1/90 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 shadow-xl space-y-6 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles size={12} />
                    SINGLE-PAIR COMPOSITE
                  </span>
                  <span className="text-xs font-mono text-slate-400">Instant Preview</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Cloud-Free Median Composite
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Ideal for rapid visual reconnaissance, cartography, and baseline surveys where cloud obstruction
                    must be completely eradicated.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Progressive Cloud Filtering:</strong> Tight 20% cloud tolerance relaxed to 40% / 70%
                      only if needed to guarantee at least 3 images for a clean median.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>SCL Cloud & Shadow Masking:</strong> Rejects cloud shadow (Class 3), medium/high cloud
                      (Class 8/9), and cirrus (Class 10) while preserving reflective urban roofs.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Temporally Chained SAR:</strong> Automatically pairs Sentinel-1 VV radar backscatter
                      captured within ±7 days of the optical pass.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Direct GeoTIFF Downloads:</strong> Instant 1-click download of calibrated 10m GeoTIFFs
                      for both Optical and SAR modalities.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between">
                <div className="text-[11px] font-mono text-slate-400">
                  Tag: <span className="text-emerald-400">Composite</span>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunchStudio("composite")}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <span>Launch Composite Mode</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Mode 2: Multi-Scene Time-Series Stack */}
            <div className="relative group p-6 sm:p-8 rounded-3xl bg-surface-1/90 border border-teal-500/20 hover:border-teal-500/40 transition-all duration-300 shadow-xl space-y-6 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30 font-mono text-xs font-semibold flex items-center gap-1.5">
                    <Clock size={12} />
                    TIME-SERIES STACK
                  </span>
                  <span className="text-xs font-mono text-slate-400">Up to 20 Scenes</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Multi-Scene Chronological Harvester
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Designed for remote sensing research, agricultural monitoring, disaster change detection, and
                    training machine learning temporal models.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 size={15} className="text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Discrete Temporal Passes:</strong> Collects up to 20 individual satellite passes across
                      your selected date window instead of blending them together.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-teal-400 shrink-0 mt-0.5">
                    <CheckCircle2 size={15} className="text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">
                      <strong>ISO-8601 Filename Sorting:</strong> Formatted as{" "}
                      <code className="text-[10px] text-teal-300 font-mono">
                        SatQuery_[Sensor]_[YYYYMMDD]_[THHMMSSZ].tif
                      </code>{" "}
                      for alphabetical & chronological alignment in GIS software.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 size={15} className="text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Background ZIP Packager:</strong> Instant browser preview of the clearest pass while
                      all 20 full-resolution GeoTIFFs are downloaded and archived in the background.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 size={15} className="text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Dataset Documentation Included:</strong> Auto-generates a presentation-ready{" "}
                      <code className="text-[11px] text-teal-300 font-mono">README_DATASET.txt</code> detailing
                      spatial resolution, sensor specs, and scene lists.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between">
                <div className="text-[11px] font-mono text-slate-400">
                  Tag: <span className="text-teal-400">Time-Series</span>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunchStudio("timeseries")}
                  className="px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all group-hover:shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                >
                  <span>Launch Time-Series Mode</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Sensor & Data Specifications Matrix ── */}
        <section id="specs" className="scroll-mt-24 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-white/[0.08] text-[11px] font-mono text-slate-300 font-semibold uppercase">
              <Cpu size={12} />
              <span>Technical Specifications</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Copernicus Satellite Pipeline Specs
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Calibrated remote sensing datasets retrieved directly via Google Earth Engine.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse glass-panel overflow-hidden">
              <thead>
                <tr className="border-b border-white/[0.08] bg-surface-2/80 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Modality / Sensor</th>
                  <th className="py-3.5 px-4">Data Product</th>
                  <th className="py-3.5 px-4">Spatial Resolution</th>
                  <th className="py-3.5 px-4">Spectral / Polarisation Bands</th>
                  <th className="py-3.5 px-4">Processing Applied</th>
                  <th className="py-3.5 px-4">Export Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    Sentinel-2 MSI
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-emerald-300">
                    COPERNICUS/S2_SR_HARMONIZED
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">10 meters / px</td>
                  <td className="py-3.5 px-4">B4 (Red), B3 (Green), B2 (Blue)</td>
                  <td className="py-3.5 px-4">
                    SCL Per-pixel Cloud/Shadow Rejection, Reflectance 0-1 Normalization, Median Composite
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    GeoTIFF (.tif) + 1024px PNG
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    Sentinel-1 C-SAR
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-cyan-300">
                    COPERNICUS/S1_GRD
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">10 meters / px</td>
                  <td className="py-3.5 px-4">VV Polarisation (IW Mode)</td>
                  <td className="py-3.5 px-4">
                    Temporal Median Speckle Reduction, Radiometric Calibration (-22 dB to 1 dB)
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    GeoTIFF (.tif) + 1024px PNG
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    Dataset Packager
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-amber-300">
                    Background Harvester
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">10 meters / px</td>
                  <td className="py-3.5 px-4">All Optical & SAR Passes</td>
                  <td className="py-3.5 px-4">
                    Asynchronous signed URL acquisition, ZIP archive compilation, dataset README bundling
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    Standardized ZIP Archive
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 5. Quick Reference & Navigation Guide ── */}
        <section id="guide" className="scroll-mt-24 p-6 sm:p-8 rounded-3xl bg-surface-2/80 border border-white/[0.08] backdrop-blur space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info size={18} className="text-emerald-400" />
                Navigating Between the Landing Page & Map Studio
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                You can switch between this guide and the interactive extraction workspace seamlessly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onLaunchStudio()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>{hasActiveAoi ? "Return to Active Session" : "Go to Map Studio"}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-surface-1/90 border border-white/[0.04] space-y-2">
              <div className="font-semibold text-emerald-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-[10px] font-mono">
                  →
                </span>
                How to Open the Extractor from this Page
              </div>
              <p className="text-slate-300 leading-relaxed">
                Click any of the <strong>"Launch Extractor"</strong>, <strong>"Launch Studio"</strong>, or{" "}
                <strong>"Launch in Mode"</strong> buttons on this page. It immediately switches to the full-viewport
                interactive map view with drawing and search tools ready.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-1/90 border border-white/[0.04] space-y-2">
              <div className="font-semibold text-cyan-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center text-[10px] font-mono">
                  ←
                </span>
                How to Return to this Guide from the Map
              </div>
              <p className="text-slate-300 leading-relaxed">
                When you are on the map, look at the top-left command bar. Click the <strong>"← Guide"</strong> back
                button anytime. Your drawn polygon, date inputs, and generated imagery results will remain safely in
                memory!
              </p>
            </div>
          </div>
        </section>

        {/* ── 6. Bottom Call to Action ── */}
        <section className="text-center py-12 rounded-3xl bg-gradient-to-b from-surface-2 to-surface-1 border border-emerald-500/20 relative overflow-hidden space-y-6">
          <div className="absolute inset-0 bg-emerald-500/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ready to Harvest Satellite GeoTIFFs?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Draw an area of interest, select your date range, and let Google Earth Engine process research-ready
              imagery in seconds.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => onLaunchStudio()}
              className="px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] transition-all duration-300 flex items-center gap-2 group cursor-pointer"
            >
              <Compass size={16} className="text-white group-hover:rotate-45 transition-transform" />
              <span>Launch Studio Map Now</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] bg-surface-1/90 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Satellite size={14} className="text-emerald-400" />
            <span className="text-slate-400 font-semibold">SatQuery AI</span> — Copernicus Remote Sensing Intelligence
          </div>
          <div>Powered by Google Earth Engine & Sentinel Satellites</div>
        </div>
      </footer>
    </div>
  );
}
