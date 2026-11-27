import { afterEach, describe, expect, it, vi } from "vitest";
import { cached, clearDataCache } from "./cache";
import { toGeoJSON } from "./geojson";
import {
  compareBySeverity,
  formatDepth,
  formatNumber,
  haversineMiles,
} from "./presentation";
import type { CrossingPrediction } from "./types";

function makePredictionFixture(
  overrides: Partial<CrossingPrediction> = {},
): CrossingPrediction {
  return {
    id: "rowlett-creek-demo",
    name: "Rowlett Creek at Alma Rd",
    road: "Alma Rd",
    creek: "Rowlett Creek",
    city: "McKinney",
    latitude: 33.1502,
    longitude: -96.7154,
    placeDetail: "Low-water bridge south of Eldorado",
    lwxType: "Low Water Bridge",
    sourceObjectId: 101,
    gaugeId: "08061540",
    gaugeName: "Rowlett Ck nr Sachse",
    gaugeNote: "USGS automated gauge",
    depthFt: 0.72,
    depthInches: 8.64,
    status: "warning",
    statusLabel: "Warning",
    vehicleNote: "Passenger sedans risk stalling.",
    dischargeCfs: 410,
    dischargeAt: "2026-11-27T14:00:00Z",
    rainfallInches: 1.25,
    rainfallLabel: "1.25 in / 6h",
    rainfallNote: "NWS grid forecast",
    updatedAt: "2026-11-27T14:05:00Z",
    mode: "live",
    disclaimer: "Model estimate only.",
    ...overrides,
  };
}

describe("toGeoJSON", () => {
  it("maps crossings into GeoJSON FeatureCollection with [lon, lat] Point coordinates", () => {
    const empty = toGeoJSON([]);
    expect(empty).toEqual({ type: "FeatureCollection", features: [] });

    const crossing = makePredictionFixture();
    const fc = toGeoJSON([crossing]);

    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].id).toBe("rowlett-creek-demo");
    expect(fc.features[0].geometry).toEqual({
      type: "Point",
      coordinates: [-96.7154, 33.1502],
    });
    expect(fc.features[0].properties.city).toBe("McKinney");
    expect(fc.features[0].properties.depthFt).toBe(0.72);
  });
});

describe("presentation helpers", () => {
  it("formats depths and nullable numbers safely across non-finite inputs", () => {
    expect(formatDepth(null)).toEqual({ feet: "—", inches: "—" });
    expect(formatDepth(Number.NaN)).toEqual({ feet: "—", inches: "—" });
    expect(formatDepth(1.5)).toEqual({ feet: "1.50 ft", inches: "18.0 in" });

    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatNumber(123.456, 2)).toBe("123.46");
  });

  it("computes haversine distance accurately between identical and North Texas points", () => {
    const prosper = { latitude: 33.2362, longitude: -96.8011 };
    const mckinney = { latitude: 33.1972, longitude: -96.6397 };

    expect(haversineMiles(prosper, prosper)).toBe(0);
    const miles = haversineMiles(prosper, mckinney);
    expect(miles).toBeGreaterThan(8.5);
    expect(miles).toBeLessThan(11.0);
  });

  it("orders predictions by severity rank first and deeper depth on ties", () => {
    const items = [
      { id: "clear", status: "clear" as const, depthFt: 0.05 },
      { id: "warn-low", status: "warning" as const, depthFt: 0.55 },
      { id: "warn-high", status: "warning" as const, depthFt: 0.9 },
      { id: "critical", status: "critical" as const, depthFt: 2.4 },
      { id: "unknown", status: "unknown" as const, depthFt: null },
    ];

    const sorted = [...items].sort(compareBySeverity).map((item) => item.id);
    expect(sorted).toEqual(["critical", "warn-high", "warn-low", "clear", "unknown"]);
  });
});

describe("cached", () => {
  afterEach(() => {
    clearDataCache();
    vi.useRealTimers();
  });

  it("deduplicates loader calls within TTL, expires after 3 minutes, and respects clearDataCache", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T14:00:00Z"));

    const loader = vi.fn(async () => ({ cfs: 312 }));
    const first = await cached("usgs:08061540", loader);
    const second = await cached("usgs:08061540", loader);

    expect(first).toEqual({ cfs: 312 });
    expect(second).toEqual({ cfs: 312 });
    expect(loader).toHaveBeenCalledTimes(1);

    // Advance past 3-minute TTL
    vi.advanceTimersByTime(3 * 60 * 1000 + 1);
    await cached("usgs:08061540", loader);
    expect(loader).toHaveBeenCalledTimes(2);

    clearDataCache();
    await cached("usgs:08061540", loader);
    expect(loader).toHaveBeenCalledTimes(3);
  });
});
