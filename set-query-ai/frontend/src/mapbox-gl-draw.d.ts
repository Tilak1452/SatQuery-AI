// Type declarations for @mapbox/mapbox-gl-draw
// This package doesn't ship its own TypeScript types

declare module "@mapbox/mapbox-gl-draw" {
  import type { IControl } from "mapbox-gl";

  interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      point?: boolean;
      line_string?: boolean;
      polygon?: boolean;
      trash?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    defaultMode?: string;
    styles?: any[];
    modes?: Record<string, any>;
  }

  class MapboxDraw implements IControl {
    constructor(options?: DrawOptions);
    onAdd(map: mapboxgl.Map): HTMLElement;
    onRemove(map: mapboxgl.Map): void;
    getDefaultPosition(): string;
    add(geojson: GeoJSON.Feature | GeoJSON.FeatureCollection): string[];
    get(featureId: string): GeoJSON.Feature | undefined;
    getFeatureIdsAt(point: { x: number; y: number }): string[];
    getSelectedIds(): string[];
    getSelected(): GeoJSON.FeatureCollection;
    getSelectedPoints(): GeoJSON.FeatureCollection;
    getAll(): GeoJSON.FeatureCollection;
    delete(ids: string | string[]): this;
    deleteAll(): this;
    set(featureCollection: GeoJSON.FeatureCollection): string[];
    trash(): this;
    combineFeatures(): this;
    uncombineFeatures(): this;
    getMode(): string;
    changeMode(mode: string, options?: any): this;
    setFeatureProperty(featureId: string, property: string, value: any): this;
  }

  export default MapboxDraw;
}
