import type { DischargeSample } from "./types";

const STALE_MS = 3 * 60 * 60 * 1000;

export function parseDischarge(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) return null;
  return value;
}

export function selectDischarge(samples: DischargeSample[], targetMs: number): DischargeSample | null {
  let best: DischargeSample | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const sample of samples) {
    const distance = Math.abs(sample.timeMs - targetMs);
    if (distance < bestDistance) {
      best = sample;
      bestDistance = distance;
    }
  }
  if (!best || bestDistance > STALE_MS) return null;
  return best;
}

interface UsgsValue {
  value?: string;
  dateTime?: string;
}

interface UsgsSeries {
  sourceInfo?: { siteCode?: { value?: string }[] };
  variable?: { variableCode?: { value?: string }[] };
  values?: { value?: UsgsValue[] }[];
}

export function parseUsgsSeries(payload: unknown): Map<string, DischargeSample[]> {
  const series = readSeries(payload);
  const bySite = new Map<string, DischargeSample[]>();
  for (const entry of series) {
    const code = entry.variable?.variableCode?.[0]?.value;
    if (code !== "00060") continue;
    const site = entry.sourceInfo?.siteCode?.[0]?.value;
    if (!site) continue;
    const samples: DischargeSample[] = [];
    for (const bucket of entry.values ?? []) {
      for (const point of bucket.value ?? []) {
        if (!point.dateTime || point.value == null) continue;
        const cfs = parseDischarge(point.value);
        const timeMs = Date.parse(point.dateTime);
        if (cfs == null || !Number.isFinite(timeMs)) continue;
        samples.push({ timeMs, cfs });
      }
    }
    const existing = bySite.get(site) ?? [];
    if (samples.length >= existing.length) bySite.set(site, samples);
  }
  return bySite;
}

function readSeries(payload: unknown): UsgsSeries[] {
  if (!payload || typeof payload !== "object") return [];
  const value = (payload as { value?: { timeSeries?: UsgsSeries[] } }).value;
  return value?.timeSeries ?? [];
}

export function usgsUrl(siteIds: string[]): string {
  const params = new URLSearchParams({
    format: "json",
    sites: siteIds.join(","),
    parameterCd: "00060",
    period: "P1D",
  });
  return `https://waterservices.usgs.gov/nwis/iv/?${params.toString()}`;
}
