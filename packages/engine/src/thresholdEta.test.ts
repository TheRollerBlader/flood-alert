import { describe, expect, it } from "vitest";
import { estimateCrossingThresholdEta } from "./thresholdEta";

const SAMPLE_CROSSING = {
  id: "rowlett-creek-demo",
  alpha: 0.01,
  beta: 0.75,
  gamma: 0.2,
  qBaseCfs: 50,
};

describe("estimateCrossingThresholdEta", () => {
  it("computes rising hours-to-warning and hours-to-critical", () => {
    const forecast = estimateCrossingThresholdEta(SAMPLE_CROSSING, 100, 150, 0);

    expect(forecast.currentStatus).toBe("watch");
    expect(forecast.warningThresholdCfs).toBeGreaterThan(100);
    expect(forecast.criticalThresholdCfs).toBeGreaterThan(forecast.warningThresholdCfs);
    expect(forecast.hoursToWarning).not.toBeNull();
    expect(forecast.hoursToCritical).not.toBeNull();
    expect(forecast.hoursToCritical!).toBeGreaterThan(forecast.hoursToWarning!);
    expect(forecast.hoursToClearWarning).toBe(0);
    expect(forecast.projectedDepthInTwoHoursFt).toBeGreaterThan(forecast.currentDepthFt);
  });

  it("computes hours-to-clear-warning when stream is receding", () => {
    const forecast = estimateCrossingThresholdEta(SAMPLE_CROSSING, 500, -100, 0);

    expect(forecast.currentStatus).toBe("warning");
    expect(forecast.hoursToWarning).toBe(0);
    expect(forecast.hoursToClearWarning).not.toBeNull();
    expect(forecast.hoursToClearWarning!).toBeGreaterThan(0);
    expect(forecast.hoursToCritical).toBeNull();
  });

  it("accounts for rainfall depth reducing remaining discharge margin", () => {
    const dry = estimateCrossingThresholdEta(SAMPLE_CROSSING, 80, 100, 0);
    const rainy = estimateCrossingThresholdEta(SAMPLE_CROSSING, 80, 100, 1.5);

    expect(rainy.warningThresholdCfs).toBeLessThan(dry.warningThresholdCfs);
    expect(rainy.currentDepthFt).toBeGreaterThan(dry.currentDepthFt);
  });
});
