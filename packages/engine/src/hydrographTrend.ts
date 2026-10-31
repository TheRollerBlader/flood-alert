import type { DischargeSample } from "./types";

export type StreamTrendCategory =
  | "rapidly_rising"
  | "rising"
  | "steady"
  | "receding"
  | "rapidly_receding";

export interface HydrographTrend {
  siteCode: string;
  currentCfs: number;
  rateOfRiseCfsPerHour: number;
  trend: StreamTrendCategory;
  sampleCount: number;
  timeWindowHours: number;
  projectedCfsInOneHour: number;
}

/**
 * Computes rate-of-rise (derivative of discharge with respect to time)
 * across recent USGS gauge readings to forecast flash flood onset.
 */
export function calculateHydrographTrend(
  siteCode: string,
  samples: DischargeSample[],
  windowHours = 2.0
): HydrographTrend | null {
  if (!samples || samples.length < 2) {
    return null;
  }

  // Sort ascending by timeMs
  const sorted = [...samples].sort((a, b) => a.timeMs - b.timeMs);
  const newest = sorted[sorted.length - 1];
  const windowStartMs = newest.timeMs - windowHours * 60 * 60 * 1000;

  const relevant = sorted.filter((s) => s.timeMs >= windowStartMs);
  if (relevant.length < 2) {
    return null;
  }

  const oldest = relevant[0];
  const deltaHours = (newest.timeMs - oldest.timeMs) / (60 * 60 * 1000);
  if (deltaHours <= 0.05) {
    // Avoid division by near-zero duration
    return null;
  }

  const deltaCfs = newest.cfs - oldest.cfs;
  const rateOfRise = deltaCfs / deltaHours;

  let trend: StreamTrendCategory = "steady";
  if (rateOfRise > 500) {
    trend = "rapidly_rising";
  } else if (rateOfRise > 50) {
    trend = "rising";
  } else if (rateOfRise < -500) {
    trend = "rapidly_receding";
  } else if (rateOfRise < -50) {
    trend = "receding";
  }

  const projectedCfs = Math.max(0, newest.cfs + rateOfRise);

  return {
    siteCode,
    currentCfs: Math.round(newest.cfs * 10) / 10,
    rateOfRiseCfsPerHour: Math.round(rateOfRise * 10) / 10,
    trend,
    sampleCount: relevant.length,
    timeWindowHours: Math.round(deltaHours * 10) / 10,
    projectedCfsInOneHour: Math.round(projectedCfs * 10) / 10,
  };
}
