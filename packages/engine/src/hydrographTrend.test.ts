import { describe, it, expect } from "vitest";
import { calculateHydrographTrend } from "./hydrographTrend";
import type { DischargeSample } from "./types";

describe("Hydrograph Rate-of-Rise & Trend Calculation", () => {
  const baseTime = 1700000000000;

  it("returns null when fewer than two samples exist", () => {
    expect(calculateHydrographTrend("08051500", [])).toBeNull();
    expect(
      calculateHydrographTrend("08051500", [{ cfs: 100, timeMs: baseTime }])
    ).toBeNull();
  });

  it("detects rapidly rising discharge during flash flood onset", () => {
    const samples: DischargeSample[] = [
      { cfs: 150, timeMs: baseTime - 60 * 60 * 1000 },
      { cfs: 400, timeMs: baseTime - 30 * 60 * 1000 },
      { cfs: 900, timeMs: baseTime },
    ];

    const trend = calculateHydrographTrend("08051500", samples, 2.0);
    expect(trend).not.toBeNull();
    expect(trend?.trend).toBe("rapidly_rising");
    expect(trend?.rateOfRiseCfsPerHour).toBeCloseTo(750, 0);
    expect(trend?.projectedCfsInOneHour).toBeGreaterThan(1500);
  });

  it("detects receding and steady stream conditions", () => {
    const steadySamples: DischargeSample[] = [
      { cfs: 50, timeMs: baseTime - 60 * 60 * 1000 },
      { cfs: 52, timeMs: baseTime },
    ];

    const steadyTrend = calculateHydrographTrend("08051500", steadySamples);
    expect(steadyTrend?.trend).toBe("steady");

    const recedingSamples: DischargeSample[] = [
      { cfs: 300, timeMs: baseTime - 60 * 60 * 1000 },
      { cfs: 180, timeMs: baseTime },
    ];

    const recedingTrend = calculateHydrographTrend("08051500", recedingSamples);
    expect(recedingTrend?.trend).toBe("receding");
    expect(recedingTrend?.rateOfRiseCfsPerHour).toBeCloseTo(-120, 0);
  });
});
