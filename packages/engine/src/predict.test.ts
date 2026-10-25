import { describe, expect, it } from "vitest";
import { clearDataCache } from "./cache";
import { CROSSINGS } from "./crossings";
import { toGeoJSON } from "./geojson";
import { predictCrossings } from "./predict";

describe("demo storm", () => {
  it("returns every hazard tier without calling the network", async () => {
    const predictions = await predictCrossings("demo", {
      now: new Date("2026-10-24T18:00:00Z"),
      fetchImpl: () => {
        throw new Error("demo mode must not fetch");
      },
    });
    expect(predictions).toHaveLength(CROSSINGS.length);
    expect(new Set(predictions.map((prediction) => prediction.status))).toEqual(
      new Set(["clear", "watch", "warning", "severe", "critical"]),
    );
    expect(predictions.every((prediction) => prediction.mode === "demo")).toBe(true);
    expect(predictions.every((prediction) => prediction.disclaimer.includes("not a measured"))).toBe(
      true,
    );
  });

  it("round-trips each scripted depth through the formula", async () => {
    const predictions = await predictCrossings("demo", {
      now: new Date("2026-10-24T18:00:00Z"),
    });
    for (const crossing of CROSSINGS) {
      const prediction = predictions.find((item) => item.id === crossing.id);
      expect(prediction?.depthFt).toBeCloseTo(crossing.demoDepthFt, 6);
    }
  });

  it("builds a GeoJSON point for every crossing", async () => {
    const predictions = await predictCrossings("demo");
    const collection = toGeoJSON(predictions);
    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features).toHaveLength(predictions.length);
    expect(collection.features[0]?.geometry.coordinates).toHaveLength(2);
  });
});

describe("live prediction", () => {
  it("uses lagged discharge and stays clear at baseflow", async () => {
    clearDataCache();
    const now = new Date("2026-10-24T23:00:00.000Z");
    const predictions = await predictCrossings("live", {
      now,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("waterservices.usgs.gov")) {
          return jsonResponse({
            value: {
              timeSeries: [
                series("08052745", "75", "2026-10-24T22:00:00.000Z"),
                series("08059590", "4", "2026-10-24T23:00:00.000Z"),
                series("08059000", "15", "2026-10-24T22:15:00.000Z"),
              ],
            },
          });
        }
        if (url.includes("/points/")) {
          return jsonResponse({
            properties: { forecastGridData: "https://api.weather.gov/gridpoints/FWD/1,1" },
          });
        }
        return jsonResponse({
          properties: {
            quantitativePrecipitation: {
              uom: "wmoUnit:mm",
              values: [{ validTime: "2026-10-24T23:00:00Z/PT6H", value: 0 }],
            },
          },
        });
      },
    });
    expect(predictions.every((prediction) => prediction.status === "clear")).toBe(true);
    expect(predictions.every((prediction) => prediction.rainfallLabel === "NWS forecast rainfall")).toBe(
      true,
    );
  });
});

function series(site: string, cfs: string, dateTime: string) {
  return {
    sourceInfo: { siteCode: [{ value: site }] },
    variable: { variableCode: [{ value: "00060" }] },
    values: [{ value: [{ value: cfs, dateTime }] }],
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
