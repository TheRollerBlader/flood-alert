import { classifyDepth } from "./hazard";
import { dischargeForDepth, predictDepth } from "./hydrology";
import type { Crossing, HazardStatus } from "./types";

export const HAZARD_DEPTH_THRESHOLDS_FT: Record<Exclude<HazardStatus, "clear">, number> = {
  watch: 0.1,
  warning: 0.5,
  severe: 1.0,
  critical: 2.0,
};

export interface ThresholdEtaForecast {
  crossingId: string;
  currentDepthFt: number;
  currentStatus: HazardStatus;
  warningThresholdCfs: number;
  criticalThresholdCfs: number;
  hoursToWarning: number | null;
  hoursToCritical: number | null;
  hoursToClearWarning: number | null;
  projectedDepthInTwoHoursFt: number;
}

/**
 * Estimates time-to-threshold (in hours) for a low-water crossing given current
 * stream discharge, linear rate-of-rise (cfs/hr), and cumulative local rainfall.
 */
export function estimateCrossingThresholdEta(
  crossing: Pick<Crossing, "id" | "alpha" | "beta" | "gamma" | "qBaseCfs">,
  currentDischargeCfs: number,
  rateOfRiseCfsPerHour: number,
  rainfallInches = 0,
): ThresholdEtaForecast {
  const safeDischarge = Math.max(0, Number.isFinite(currentDischargeCfs) ? currentDischargeCfs : 0);
  const safeRain = Math.max(0, Number.isFinite(rainfallInches) ? rainfallInches : 0);
  const safeRate = Number.isFinite(rateOfRiseCfsPerHour) ? rateOfRiseCfsPerHour : 0;

  const currentDepthFt = predictDepth({
    dischargeCfs: safeDischarge,
    qBaseCfs: crossing.qBaseCfs,
    alpha: crossing.alpha,
    beta: crossing.beta,
    gamma: crossing.gamma,
    rainfallInches: safeRain,
  });

  const rainDepthFt = crossing.gamma * safeRain;
  const neededFlowDepthFor = (targetDepthFt: number): number =>
    Math.max(0, targetDepthFt - rainDepthFt);

  const warningThresholdCfs = dischargeForDepth({
    depthFt: neededFlowDepthFor(HAZARD_DEPTH_THRESHOLDS_FT.warning),
    qBaseCfs: crossing.qBaseCfs,
    alpha: crossing.alpha,
    beta: crossing.beta,
  });

  const criticalThresholdCfs = dischargeForDepth({
    depthFt: neededFlowDepthFor(HAZARD_DEPTH_THRESHOLDS_FT.critical),
    qBaseCfs: crossing.qBaseCfs,
    alpha: crossing.alpha,
    beta: crossing.beta,
  });

  const hoursToTarget = (targetCfs: number): number | null => {
    if (safeDischarge >= targetCfs) return 0;
    if (safeRate <= 1e-6) return null;
    return Math.round(((targetCfs - safeDischarge) / safeRate) * 100) / 100;
  };

  const hoursToClear = (targetCfs: number): number | null => {
    if (safeDischarge < targetCfs) return 0;
    if (safeRate >= -1e-6) return null;
    return Math.round(((safeDischarge - targetCfs) / Math.abs(safeRate)) * 100) / 100;
  };

  const projectedDischarge2h = Math.max(0, safeDischarge + safeRate * 2);
  const projectedDepthInTwoHoursFt = predictDepth({
    dischargeCfs: projectedDischarge2h,
    qBaseCfs: crossing.qBaseCfs,
    alpha: crossing.alpha,
    beta: crossing.beta,
    gamma: crossing.gamma,
    rainfallInches: safeRain,
  });

  return {
    crossingId: crossing.id,
    currentDepthFt: Math.round(currentDepthFt * 1000) / 1000,
    currentStatus: classifyDepth(currentDepthFt),
    warningThresholdCfs: Math.round(warningThresholdCfs * 10) / 10,
    criticalThresholdCfs: Math.round(criticalThresholdCfs * 10) / 10,
    hoursToWarning: hoursToTarget(warningThresholdCfs),
    hoursToCritical: hoursToTarget(criticalThresholdCfs),
    hoursToClearWarning: hoursToClear(warningThresholdCfs),
    projectedDepthInTwoHoursFt: Math.round(projectedDepthInTwoHoursFt * 1000) / 1000,
  };
}
