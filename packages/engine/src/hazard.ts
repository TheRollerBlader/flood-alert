import type { DisplayStatus, HazardStatus } from "./types";

export function classifyDepth(depthFt: number): HazardStatus {
  if (depthFt >= 2) return "critical";
  if (depthFt >= 1) return "severe";
  if (depthFt >= 0.5) return "warning";
  if (depthFt >= 0.1) return "watch";
  return "clear";
}

export function isAlertStatus(status: DisplayStatus): boolean {
  return status === "warning" || status === "severe" || status === "critical";
}

export const STATUS_RANK: Record<DisplayStatus, number> = {
  critical: 0,
  severe: 1,
  warning: 2,
  watch: 3,
  clear: 4,
  unknown: 5,
};
