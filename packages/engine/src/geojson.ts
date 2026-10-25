import type { CrossingPrediction } from "./types";

export interface CrossingFeatureCollection {
  type: "FeatureCollection";
  features: CrossingFeature[];
}

export interface CrossingFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Omit<CrossingPrediction, "latitude" | "longitude"> & {
    latitude: number;
    longitude: number;
  };
}

export function toGeoJSON(crossings: CrossingPrediction[]): CrossingFeatureCollection {
  return {
    type: "FeatureCollection",
    features: crossings.map((crossing) => ({
      type: "Feature",
      id: crossing.id,
      geometry: {
        type: "Point",
        coordinates: [crossing.longitude, crossing.latitude],
      },
      properties: { ...crossing },
    })),
  };
}
