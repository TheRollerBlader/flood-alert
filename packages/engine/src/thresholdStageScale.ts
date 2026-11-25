import { STATUS_STYLES } from "./presentation";
import { HAZARD_DEPTH_THRESHOLDS_FT } from "./thresholdEta";
import type { HazardStatus } from "./types";

export interface StageBandSegment {
  status: HazardStatus;
  label: string;
  color: string;
  minFt: number;
  maxFt: number;
  startPct: number;
  widthPct: number;
}

export interface ThresholdGaugeScale {
  maxScaleFt: number;
  markerPct: number | null;
  segments: StageBandSegment[];
  nextThreshold: {
    status: Exclude<HazardStatus, "clear">;
    label: string;
    thresholdFt: number;
    remainingFt: number;
  } | null;
}

const DEFAULT_SCALE_CEILING_FT = 2.5;

/**
 * Computes proportional band geometry and marker position for visualizing a
 * low-water crossing depth against North Texas hazard thresholds.
 */
export function buildThresholdGaugeScale(depthFt: number | null): ThresholdGaugeScale {
  const safeDepth = depthFt != null && Number.isFinite(depthFt) ? Math.max(0, depthFt) : null;
  const maxScaleFt =
    safeDepth != null && safeDepth > DEFAULT_SCALE_CEILING_FT
      ? Math.ceil((safeDepth + 0.25) * 2) / 2
      : DEFAULT_SCALE_CEILING_FT;

  const boundaries: Array<{ status: HazardStatus; minFt: number; maxFt: number }> = [
    { status: "clear", minFt: 0, maxFt: HAZARD_DEPTH_THRESHOLDS_FT.watch },
    {
      status: "watch",
      minFt: HAZARD_DEPTH_THRESHOLDS_FT.watch,
      maxFt: HAZARD_DEPTH_THRESHOLDS_FT.warning,
    },
    {
      status: "warning",
      minFt: HAZARD_DEPTH_THRESHOLDS_FT.warning,
      maxFt: HAZARD_DEPTH_THRESHOLDS_FT.severe,
    },
    {
      status: "severe",
      minFt: HAZARD_DEPTH_THRESHOLDS_FT.severe,
      maxFt: HAZARD_DEPTH_THRESHOLDS_FT.critical,
    },
    {
      status: "critical",
      minFt: HAZARD_DEPTH_THRESHOLDS_FT.critical,
      maxFt: maxScaleFt,
    },
  ];

  const segments: StageBandSegment[] = boundaries.map((b) => ({
    status: b.status,
    label: STATUS_STYLES[b.status].label,
    color: STATUS_STYLES[b.status].fill,
    minFt: b.minFt,
    maxFt: b.maxFt,
    startPct: (b.minFt / maxScaleFt) * 100,
    widthPct: ((b.maxFt - b.minFt) / maxScaleFt) * 100,
  }));

  const markerPct =
    safeDepth != null ? Math.min(100, Math.max(0, (safeDepth / maxScaleFt) * 100)) : null;

  const orderedThresholds: Array<Exclude<HazardStatus, "clear">> = [
    "watch",
    "warning",
    "severe",
    "critical",
  ];
  let nextThreshold: ThresholdGaugeScale["nextThreshold"] = null;
  if (safeDepth != null) {
    for (const status of orderedThresholds) {
      const thresholdFt = HAZARD_DEPTH_THRESHOLDS_FT[status];
      if (safeDepth < thresholdFt) {
        nextThreshold = {
          status,
          label: STATUS_STYLES[status].label,
          thresholdFt,
          remainingFt: Number((thresholdFt - safeDepth).toFixed(2)),
        };
        break;
      }
    }
  }

  return {
    maxScaleFt,
    markerPct,
    segments,
    nextThreshold,
  };
}
