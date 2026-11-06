import { describe, expect, it } from "vitest";
import { CROSSINGS, GAUGES, findCrossing } from "./crossings";
import { toGeoJSON } from "./geojson";
import type { CrossingPrediction } from "./types";

describe("Crossings and Gauges Registry", () => {
  it("defines standard USGS monitoring gauges for North Texas waterways", () => {
    expect(Object.keys(GAUGES).length).toBeGreaterThanOrEqual(3);
    for (const [gaugeId, gauge] of Object.entries(GAUGES)) {
      expect(gauge.id).toBe(gaugeId);
      expect(gauge.name.length).toBeGreaterThan(0);
      expect(gauge.latitude).toBeGreaterThan(33.0);
      expect(gauge.latitude).toBeLessThan(33.5);
      expect(gauge.longitude).toBeLessThan(-96.0);
      expect(gauge.longitude).toBeGreaterThan(-97.2);
      expect(gauge.alpha).toBeGreaterThan(0);
      expect(gauge.beta).toBeGreaterThan(0);
      expect(gauge.gamma).toBeGreaterThan(0);
      expect(gauge.qBaseCfs).toBeGreaterThanOrEqual(0);
    }
  });

  it("contains valid crossing configurations with foreign keys to monitored gauges", () => {
    expect(CROSSINGS.length).toBeGreaterThan(0);
    const validCities = new Set(["Prosper", "Frisco", "McKinney"]);

    for (const crossing of CROSSINGS) {
      expect(crossing.id).toBeTruthy();
      expect(crossing.name).toBeTruthy();
      expect(crossing.road).toBeTruthy();
      expect(crossing.creek).toBeTruthy();
      expect(validCities.has(crossing.city)).toBe(true);

      // Coordinate bounds for North Texas low water crossings
      expect(crossing.latitude).toBeGreaterThan(33.1);
      expect(crossing.latitude).toBeLessThan(33.4);
      expect(crossing.longitude).toBeLessThan(-96.5);
      expect(crossing.longitude).toBeGreaterThan(-97.0);

      // Monitored gauge association
      expect(GAUGES[crossing.gaugeId]).toBeDefined();
      expect(crossing.gaugeName).toBe(GAUGES[crossing.gaugeId].name);

      // Hydrological model parameters
      expect(crossing.alpha).toBeGreaterThan(0);
      expect(crossing.beta).toBeGreaterThan(0);
      expect(crossing.gamma).toBeGreaterThan(0);
      expect(crossing.lagMinutes).toBeGreaterThanOrEqual(0);
      expect(crossing.rainfallWindowHours).toBeGreaterThan(0);
    }
  });

  it("findCrossing retrieves by unique identifier or returns undefined", () => {
    const known = CROSSINGS[0];
    expect(findCrossing(known.id)).toEqual(known);
    expect(findCrossing("non-existent-crossing-id-xyz")).toBeUndefined();
  });

  it("converts crossing predictions into GeoJSON FeatureCollection with point coordinates", () => {
    const mockPredictions: CrossingPrediction[] = CROSSINGS.slice(0, 3).map((c) => ({
      ...c,
      status: "watch",
      trend: "rising",
      crestDepthFt: 1.2,
      estimatedTimeUntilCrestMinutes: 45,
      peakWindowStart: new Date().toISOString(),
      peakWindowEnd: new Date(Date.now() + 3600000).toISOString(),
      confidence: 0.88,
      recommendedAction: "Exercise caution at low-water crossings",
      rationale: ["Upstream USGS gauge discharge increasing rapidly"],
      summary: "Potential overflow expected within the hour",
      modelComponents: {
        rainfallDepthFt: 0.4,
        upstreamDepthFt: 0.8,
        adjustedDischargeCfs: 140,
        historicalDischargeCfs: 40,
      },
    }));

    const geojson = toGeoJSON(mockPredictions);
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features).toHaveLength(3);

    for (let i = 0; i < mockPredictions.length; i++) {
      const feature = geojson.features[i];
      const pred = mockPredictions[i];
      expect(feature.type).toBe("Feature");
      expect(feature.id).toBe(pred.id);
      expect(feature.geometry.type).toBe("Point");
      // GeoJSON standard: [longitude, latitude]
      expect(feature.geometry.coordinates).toEqual([pred.longitude, pred.latitude]);
      expect(feature.properties.id).toBe(pred.id);
      expect(feature.properties.status).toBe("watch");
    }
  });
});
