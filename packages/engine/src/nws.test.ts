import { describe, expect, it } from "vitest";
import { parseRainSamples, rainfallInWindow, toInches } from "./nws";

describe("NWS rainfall", () => {
  it("converts millimeters to inches", () => {
    expect(toInches(25.4, "wmoUnit:mm")).toBeCloseTo(1, 6);
    expect(toInches(1.5, "wmoUnit:in")).toBe(1.5);
  });

  it("sums forecast rainfall that overlaps the window", () => {
    const samples = parseRainSamples({
      properties: {
        quantitativePrecipitation: {
          uom: "wmoUnit:mm",
          values: [
            { validTime: "2026-10-24T22:00:00Z/PT1H", value: 25.4 },
            { validTime: "2026-10-24T23:00:00Z/PT1H", value: 12.7 },
            { validTime: "2026-10-25T06:00:00Z/PT1H", value: 25.4 },
          ],
        },
      },
    });
    const now = Date.parse("2026-10-24T22:00:00Z");
    expect(rainfallInWindow(samples, now, 6)).toBeCloseTo(1.5, 6);
  });

  it("prorates a block that only partly overlaps the window", () => {
    const samples = parseRainSamples({
      quantitativePrecipitation: {
        uom: "wmoUnit:mm",
        values: [{ validTime: "2026-10-24T20:00:00Z/PT2H", value: 25.4 }],
      },
    });
    const now = Date.parse("2026-10-24T21:00:00Z");
    expect(rainfallInWindow(samples, now, 6)).toBeCloseTo(0.5, 6);
  });
});
