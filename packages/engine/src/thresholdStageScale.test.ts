import { describe, expect, it } from "vitest";
import { buildThresholdGaugeScale } from "./thresholdStageScale";

describe("buildThresholdGaugeScale", () => {
  it("computes contiguous hazard segments summing to 100% width", () => {
    const scale = buildThresholdGaugeScale(0.35);
    const totalWidth = scale.segments.reduce((sum, seg) => sum + seg.widthPct, 0);

    expect(scale.segments).toHaveLength(5);
    expect(totalWidth).toBeCloseTo(100, 6);
    expect(scale.markerPct).toBeCloseTo((0.35 / 2.5) * 100, 4);
    expect(scale.nextThreshold).toEqual({
      status: "warning",
      label: "Warning",
      thresholdFt: 0.5,
      remainingFt: 0.15,
    });
  });

  it("expands the scale ceiling when depth exceeds 2.5 ft and clears nextThreshold", () => {
    const scale = buildThresholdGaugeScale(3.1);
    expect(scale.maxScaleFt).toBe(3.5);
    expect(scale.markerPct).toBeCloseTo((3.1 / 3.5) * 100, 4);
    expect(scale.nextThreshold).toBeNull();
  });

  it("returns null marker and nextThreshold when depth is unknown", () => {
    const scale = buildThresholdGaugeScale(null);
    expect(scale.markerPct).toBeNull();
    expect(scale.nextThreshold).toBeNull();
    expect(scale.maxScaleFt).toBe(2.5);
  });
});
