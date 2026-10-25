import { isAlertStatus, STATUS_RANK } from "./hazard";
import type { DisplayStatus } from "./types";

export const NEAR_MILES = 1;

export const DISCLAIMER =
  "Predicted from gauge discharge and forecast rainfall. This is not a measured water depth, and no drone verified it.";

export const DATA_SOURCES =
  "Crossings from the Texas Geographic Information Office low-water inventory. Discharge from USGS Water Services. Rainfall from the National Weather Service forecast grid, not radar-observed MRMS.";

export interface StatusStyle {
  label: string;
  fill: string;
  ink: string;
  vehicleNote: string;
}

export const STATUS_STYLES: Record<DisplayStatus, StatusStyle> = {
  clear: {
    label: "Clear",
    fill: "#1F8A70",
    ink: "#08382E",
    vehicleNote: "Under 0.1 ft. A typical vehicle can cross as usual.",
  },
  watch: {
    label: "Watch",
    fill: "#C8960C",
    ink: "#3D2E04",
    vehicleNote:
      "Water is building between 0.1 and 0.5 ft. Do not assume the dip is dry.",
  },
  warning: {
    label: "Warning",
    fill: "#E06A12",
    ink: "#4A2206",
    vehicleNote:
      "At least 0.5 ft. Water can reach the lower chassis of a passenger sedan. Traction loss and an engine stall become likely.",
  },
  severe: {
    label: "Severe",
    fill: "#D92D20",
    ink: "#4C0B07",
    vehicleNote:
      "At least 1 ft. A small car can start to float, and current can push it off the road.",
  },
  critical: {
    label: "Critical",
    fill: "#9F1239",
    ink: "#4A0519",
    vehicleNote:
      "At least 2 ft. Even an SUV or light truck can float and be swept downstream. Do not enter.",
  },
  unknown: {
    label: "Unknown",
    fill: "#5C6B73",
    ink: "#1C272D",
    vehicleNote: "The gauge did not return a usable discharge, so depth was not estimated.",
  },
};

export function formatDepth(depthFt: number | null): { feet: string; inches: string } {
  if (depthFt == null || !Number.isFinite(depthFt)) {
    return { feet: "—", inches: "—" };
  }
  const inches = depthFt * 12;
  return {
    feet: `${depthFt.toFixed(2)} ft`,
    inches: `${inches.toFixed(1)} in`,
  };
}

export function formatNumber(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function haversineMiles(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthMiles = 3958.8;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthMiles * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function compareBySeverity(
  a: { status: DisplayStatus; depthFt: number | null },
  b: { status: DisplayStatus; depthFt: number | null },
): number {
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (rank !== 0) return rank;
  return (b.depthFt ?? -1) - (a.depthFt ?? -1);
}

export { isAlertStatus };
