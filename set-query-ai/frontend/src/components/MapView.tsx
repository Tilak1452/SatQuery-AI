/**
 * MapView — Full-viewport Mapbox GL map with premium AOI drawing tools.
 *
 * Features:
 * - Map vignette for depth
 * - Premium tool buttons with active glow states
 * - Animated AOI polygon styling
 * - 3D terrain toggle
 * - Sentinel-2 mosaic layer toggle
 */

import { useEffect, useCallback, useRef, useState } from "react";
import Map, { NavigationControl, type MapRef } from "react-map-gl/mapbox";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { Mountain, Layers, Trash2 } from "lucide-react";
import type { AppState, AoiGeometry } from "../types";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

// High-resolution global satellite tiles (Zero-token open fallback)
const OPEN_SATELLITE_STYLE: any = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    {
      id: "esri-satellite-layer",
      type: "raster",
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

interface MapViewProps {
  appState: AppState;
  aoi?: AoiGeometry | null;
  mapRef: React.RefObject<MapRef | null>;
  onAoiChange: (geometry: AoiGeometry | null) => void;
}

export default function MapView({
  appState,
  aoi,
  mapRef,
  onAoiChange,
}: MapViewProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [isSentinel, setIsSentinel] = useState(false);

  // If token is missing or is the expired placeholder mr-x key, use open satellite style directly
  const isInvalidToken = !MAPBOX_TOKEN || MAPBOX_TOKEN.includes("mr-x");
  const [currentStyle, setCurrentStyle] = useState<any>(
    isInvalidToken
      ? OPEN_SATELLITE_STYLE
      : "mapbox://styles/mapbox/satellite-streets-v12"
  );

  // Initialize MapboxDraw when map loads
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "simple_select",
      styles: [
        // Polygon fill — emerald glow
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"]],
          paint: {
            "fill-color": "#10B981",
            "fill-outline-color": "#10B981",
            "fill-opacity": 0.1,
          },
        },
        // Polygon outline — animated dashed border
        {
          id: "gl-draw-polygon-stroke-active",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"]],
          paint: {
            "line-color": "#10B981",
            "line-width": 2,
            "line-dasharray": [3, 2],
          },
        },
        // Vertex points — glow dots
        {
          id: "gl-draw-point",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
          paint: {
            "circle-radius": 5,
            "circle-color": "#10B981",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
            "circle-blur": 0.1,
          },
        },
        // Midpoints
        {
          id: "gl-draw-point-midpoint",
          type: "circle",
          filter: [
            "all",
            ["==", "$type", "Point"],
            ["==", "meta", "midpoint"],
          ],
          paint: {
            "circle-radius": 3,
            "circle-color": "#34D399",
            "circle-opacity": 0.6,
          },
        },
        // Line string (for drawing in progress)
        {
          id: "gl-draw-line",
          type: "line",
          filter: ["all", ["==", "$type", "LineString"]],
          paint: {
            "line-color": "#06B6D4",
            "line-width": 2,
            "line-dasharray": [4, 2],
          },
        },
      ],
    });

    map.addControl(draw as any, "top-right");
    drawRef.current = draw;

    // Listen for draw events
    const updateAoi = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const feature = data.features[data.features.length - 1];
        onAoiChange(feature.geometry as AoiGeometry);
      } else {
        onAoiChange(null);
      }
    };

    map.on("draw.create", updateAoi);
    map.on("draw.update", updateAoi);
    map.on("draw.delete", () => onAoiChange(null));

    // Add 3D Terrain source safely
    if (map.getSource && !map.getSource("mapbox-dem")) {
      try {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      } catch (e) {
        // Ignored if mapbox-dem is not supported by style
      }
    }

    // Add Sentinel-2 Global Mosaic Fallback safely
    if (map.getSource && !map.getSource("sentinel-2")) {
      try {
        map.addSource("sentinel-2", {
          type: "raster",
          tiles: [
            "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg",
          ],
          tileSize: 256,
          maxzoom: 14,
          attribution:
            'Sentinel-2 cloudless - <a href="https://s2maps.eu">s2maps.eu</a> by <a href="https://eox.at">EOX IT Services GmbH</a>',
        });
      } catch (e) {
        // Ignored if sentinel-2 is not supported
      }
    }
  }, [onAoiChange, mapRef]);

  // Sync AOI from props to draw tool (for auto-selection and deletion)
  useEffect(() => {
    if (!drawRef.current) return;
    if (aoi) {
      const currentDraws = drawRef.current.getAll();
      if (
        currentDraws.features.length === 0 ||
        JSON.stringify(currentDraws.features[0].geometry) !==
          JSON.stringify(aoi)
      ) {
        drawRef.current.set({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              id: "synced-aoi",
              properties: {},
              geometry: aoi,
            },
          ],
        });
      }
    } else {
      const currentDraws = drawRef.current.getAll();
      if (currentDraws.features.length > 0) {
        drawRef.current.deleteAll();
      }
    }
  }, [aoi]);

  // Toggle 3D Ground View
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (is3D) {
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      map.easeTo({ pitch: 60, bearing: 15, duration: 1500 });
    } else {
      map.setTerrain(null as any);
      map.easeTo({ pitch: 0, bearing: 0, duration: 1500 });
    }
  }, [is3D, mapRef]);

  // Toggle Sentinel-2 Fallback
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;

    if (isSentinel) {
      if (!map.getLayer("sentinel-2-layer")) {
        const layers = map.getStyle().layers;
        let firstSymbolId = undefined;
        if (layers) {
          for (const layer of layers) {
            if (layer.type === "symbol") {
              firstSymbolId = layer.id;
              break;
            }
          }
        }

        map.addLayer(
          {
            id: "sentinel-2-layer",
            type: "raster",
            source: "sentinel-2",
            paint: {
              "raster-opacity": 1,
            },
          },
          firstSymbolId
        );
      }
    } else {
      if (map.getLayer("sentinel-2-layer")) {
        map.removeLayer("sentinel-2-layer");
      }
    }
  }, [isSentinel, mapRef]);

  // Disable drawing during processing
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !drawRef.current) return;

    if (appState === "processing") {
      drawRef.current.changeMode("simple_select");
      map.getCanvas().style.cursor = "wait";
    } else {
      map.getCanvas().style.cursor = "";
    }
  }, [appState, mapRef]);

  // Clear drawings on reset
  useEffect(() => {
    if (appState === "idle" && drawRef.current) {
      drawRef.current.deleteAll();
    }
  }, [appState]);

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={
          MAPBOX_TOKEN && !MAPBOX_TOKEN.includes("mr-x")
            ? MAPBOX_TOKEN
            : "pk.eyJ1IjoicHVibGljLWVzcmkiLCJhIjoiY2twdWJsaWMifQ.dummy"
        }
        initialViewState={{
          longitude: 78.9629,
          latitude: 20.5937,
          zoom: 4,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={currentStyle}
        onError={(e) => {
          console.warn("Map style failed or token invalid, falling back to open ESRI satellite:", e);
          if (currentStyle !== OPEN_SATELLITE_STYLE) {
            setCurrentStyle(OPEN_SATELLITE_STYLE);
          }
        }}
        onLoad={handleMapLoad}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
      </Map>

      {/* Vignette overlay for depth */}
      <div className="map-vignette" />

      {/* ── Map Tools Overlay ── */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-2 z-10">
        {aoi && (
          <button
            onClick={() => onAoiChange(null)}
            className="map-tool-btn border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/60"
            title="Delete Selected Area"
          >
            <Trash2 size={17} />
          </button>
        )}
        <button
          onClick={() => setIs3D(!is3D)}
          className={`map-tool-btn ${is3D ? "active" : ""}`}
          title="Toggle 3D Terrain"
        >
          <Mountain size={17} />
        </button>
        <button
          onClick={() => setIsSentinel(!isSentinel)}
          className={`map-tool-btn ${isSentinel ? "active" : ""}`}
          title="Toggle Sentinel-2 Mosaic"
        >
          <Layers size={17} />
        </button>
      </div>
    </div>
  );
}
