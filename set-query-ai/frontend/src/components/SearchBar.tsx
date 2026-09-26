/**
 * SearchBar — Premium search with animated focus glow and staggered dropdown.
 *
 * Supports:
 * - Place name geocoding (Mapbox API)
 * - Coordinate input (lat, lng)
 * - GeoJSON / WKT polygon input
 */

import { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Navigation,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { parseInputGeometry, computeGeodesicAreaKm2 } from "../utils/area";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  isCoordinate?: boolean;
  geometry?: any;
}

interface SearchBarProps {
  onLocationSelect: (result: SearchResult) => void;
  maxAoiAreaKm2?: number;
  minAoiAreaKm2?: number;
}

export default function SearchBar({
  onLocationSelect,
  maxAoiAreaKm2 = 250,
  minAoiAreaKm2 = 0.25,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [geometryInfo, setGeometryInfo] = useState<{
    area: number;
    valid: boolean;
    errorType?: string | null;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    setGeometryInfo(null);
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // 0. Check if input is GeoJSON or WKT
    const geometry = parseInputGeometry(query);
    if (geometry) {
      const area = computeGeodesicAreaKm2(geometry);
      let errorType: string | null = null;
      if (area > maxAoiAreaKm2) {
        errorType = "too_large";
      } else if (area < minAoiAreaKm2) {
        errorType = "too_small";
      }
      const valid = errorType === null;
      setGeometryInfo({ area, valid, errorType });

      if (valid) {
        const center = geometry.coordinates[0][0];
        setResults([
          {
            id: "polygon",
            place_name: `Polygon Area: ${area.toFixed(1)} km²`,
            center: [center[0], center[1]],
            geometry: geometry,
          },
        ]);
        setIsOpen(true);
      }
      return;
    }

    // 1. Check if input is coordinates
    const coordRegex =
      /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
    const match = query.match(coordRegex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setResults([
          {
            id: "coord",
            place_name: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            center: [lng, lat],
            isCoordinate: true,
          },
        ]);
        setIsOpen(true);
        return;
      }
    }

    // 2. Call Mapbox Geocoding API
    const fetchPlaces = async () => {
      setIsLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_TOKEN}&types=country,region,postcode,district,place,locality,neighborhood,address,poi`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.features) {
          const formattedResults = data.features.map((f: any) => ({
            id: f.id,
            place_name: f.place_name,
            center: f.center,
            bbox: f.bbox,
          }));
          setResults(formattedResults);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchPlaces, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    onLocationSelect(result);
    setQuery(result.place_name);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-80 md:w-96 ml-4">
      {/* Search input with animated glow wrapper */}
      <div className="search-input-wrapper">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 flex items-center justify-center text-slate-500">
            {isLoading ? (
              <Loader2 size={15} className="animate-spin text-emerald-400" />
            ) : (
              <Search size={15} />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0 || geometryInfo?.valid === false)
                setIsOpen(true);
            }}
            placeholder="Search places, 'lat, lng', WKT…"
            className="w-full bg-surface-2/60 border border-white/[0.06] text-white text-sm rounded-xl py-2.5 pl-10 pr-28 focus:outline-none focus:border-emerald-500/30 focus:bg-surface-2/80 transition-all duration-300 placeholder-slate-600 font-medium"
          />
          {geometryInfo && (
            <div className="absolute right-2.5 flex items-center">
              <span
                className={`text-[10px] px-2.5 py-1 rounded-md border font-mono font-semibold tracking-wide ${
                  geometryInfo.valid
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {geometryInfo.area.toFixed(1)} km²
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Geometry validation error */}
      {isOpen && geometryInfo?.valid === false && (
        <div className="absolute top-full mt-2 w-full glass-panel p-4 z-50 animate-slide-down border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="text-amber-400" size={14} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white leading-none mb-1.5">
                {geometryInfo.errorType === "too_large"
                  ? "Area Exceeds Limit"
                  : "Area Too Small"}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {geometryInfo.errorType === "too_large"
                  ? `The geometry covers ${geometryInfo.area.toFixed(1)} km², exceeding the ${maxAoiAreaKm2} km² limit.`
                  : `The geometry covers ${geometryInfo.area.toFixed(2)} km², below the ${minAoiAreaKm2} km² minimum.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search results dropdown */}
      {isOpen && results.length > 0 && !geometryInfo && (
        <div className="absolute top-full mt-2 w-full glass-panel overflow-hidden z-50 animate-slide-down max-h-72 overflow-y-auto">
          {results.map((result, idx) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-all duration-200 flex items-start gap-3 border-b border-white/[0.03] last:border-0 group"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Left accent bar on hover */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-r" />

              <div className="mt-0.5 shrink-0 text-slate-500 group-hover:text-emerald-400 transition-colors">
                {result.geometry ? (
                  <CheckCircle2 size={15} />
                ) : result.isCoordinate ? (
                  <Navigation size={15} />
                ) : (
                  <MapPin size={15} />
                )}
              </div>
              <span className="text-sm text-slate-300 group-hover:text-slate-100 leading-tight transition-colors">
                {result.place_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
