export function computeGeodesicAreaKm2(geometry: any): number {
  if (!geometry || !geometry.coordinates) return 0;
  
  const coords = geometry.coordinates;
  if (geometry.type === "MultiPolygon") {
    return coords.reduce((sum: number, polygon: any) => sum + ringAreaKm2(polygon[0]), 0);
  }
  
  if (geometry.type === "Polygon") {
    return ringAreaKm2(coords[0]);
  }
  return 0;
}

function ringAreaKm2(ring: number[][]): number {
  const n = ring.length;
  if (n < 3) return 0;

  let areaDeg2 = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaDeg2 += ring[i][0] * ring[j][1];
    areaDeg2 -= ring[j][0] * ring[i][1];
  }
  areaDeg2 = Math.abs(areaDeg2) / 2.0;

  const meanLat = ring.reduce((sum, p) => sum + p[1], 0) / n;
  const latRad = (meanLat * Math.PI) / 180;

  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos(latRad);

  return areaDeg2 * kmPerDegLat * kmPerDegLon;
}

export function parseInputGeometry(input: string): any | null {
  const trimmed = input.trim();
  
  // Try JSON (GeoJSON)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj.type === "FeatureCollection" && obj.features?.length > 0) {
        return obj.features[0].geometry;
      }
      if (obj.type === "Feature" && obj.geometry) {
        return obj.geometry;
      }
      if (obj.type === "Polygon" || obj.type === "MultiPolygon") {
        return obj;
      }
    } catch (e) {
      // Not valid JSON
    }
  }

  // Try WKT (POLYGON)
  // Example: POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))
  if (trimmed.toUpperCase().startsWith("POLYGON")) {
    const coordsMatch = trimmed.match(/POLYGON\s*\(\s*\((.*)\)\s*\)/i);
    if (coordsMatch) {
      const coordString = coordsMatch[1];
      const points = coordString.split(",").map(p => {
        const parts = p.trim().split(/\s+/);
        return [parseFloat(parts[0]), parseFloat(parts[1])];
      });
      return {
        type: "Polygon",
        coordinates: [points]
      };
    }
  }

  return null;
}
