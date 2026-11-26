/**
 * Real-time USGS Hydrological Stream Telemetry Client and Flood Stage Analyzer.
 * Parses USGS IV REST responses for parameter 00065 (gage height, ft) and 00060 (discharge, cfs)
 * across North Texas watershed monitoring stations (Collin and Denton counties).
 */

export interface GaugeThresholds {
  actionStageFt: number;
  minorFloodFt: number;
  moderateFloodFt: number;
  majorFloodFt: number;
}

export interface StreamGaugeStation {
  siteId: string;
  stationName: string;
  county: string;
  waterway: string;
  thresholds: GaugeThresholds;
}

export const NORTH_TEXAS_GAUGES: Record<string, StreamGaugeStation> = {
  '08059800': {
    siteId: '08059800',
    stationName: 'Rowlett Ck at SH 78 nr Sachse, TX',
    county: 'Dallas/Collin',
    waterway: 'Rowlett Creek',
    thresholds: { actionStageFt: 14.0, minorFloodFt: 16.0, moderateFloodFt: 19.0, majorFloodFt: 22.0 },
  },
  '08051500': {
    siteId: '08051500',
    stationName: 'East Fork Trinity Rv nr McKinney, TX',
    county: 'Collin',
    waterway: 'East Fork Trinity River',
    thresholds: { actionStageFt: 15.0, minorFloodFt: 17.0, moderateFloodFt: 20.0, majorFloodFt: 24.0 },
  },
  '08052800': {
    siteId: '08052800',
    stationName: 'Wilson Ck nr McKinney, TX',
    county: 'Collin',
    waterway: 'Wilson Creek',
    thresholds: { actionStageFt: 10.0, minorFloodFt: 12.0, moderateFloodFt: 15.0, majorFloodFt: 18.0 },
  },
};

export type FloodRiskSeverity = 'NORMAL' | 'ACTION' | 'MINOR' | 'MODERATE' | 'MAJOR';

export interface GaugeTelemetryReading {
  siteId: string;
  timestamp: string;
  gageHeightFt: number | null;
  dischargeCfs: number | null;
  rateOfRiseFtPerHr: number;
  severity: FloodRiskSeverity;
}

export function evaluateFloodSeverity(gageHeightFt: number, thresholds: GaugeThresholds): FloodRiskSeverity {
  if (gageHeightFt >= thresholds.majorFloodFt) return 'MAJOR';
  if (gageHeightFt >= thresholds.moderateFloodFt) return 'MODERATE';
  if (gageHeightFt >= thresholds.minorFloodFt) return 'MINOR';
  if (gageHeightFt >= thresholds.actionStageFt) return 'ACTION';
  return 'NORMAL';
}

export function parseUsgsGageHeightSeries(
  payload: any,
  targetSiteId: string
): { timestamp: string; heightFt: number }[] {
  const series = payload?.value?.timeSeries ?? [];
  const results: { timestamp: string; heightFt: number }[] = [];

  for (const s of series) {
    const site = s.sourceInfo?.siteCode?.[0]?.value;
    const variable = s.variable?.variableCode?.[0]?.value;
    if (site !== targetSiteId || variable !== '00065') continue;

    const values = s.values?.[0]?.value ?? [];
    for (const v of values) {
      const height = parseFloat(v.value);
      if (Number.isFinite(height) && v.dateTime) {
        results.push({ timestamp: v.dateTime, heightFt: height });
      }
    }
  }

  return results.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export function analyzeStreamTelemetry(
  siteId: string,
  history: { timestamp: string; heightFt: number }[],
  latestDischargeCfs: number | null = null
): GaugeTelemetryReading | null {
  if (history.length === 0) return null;

  const station = NORTH_TEXAS_GAUGES[siteId] ?? {
    siteId,
    stationName: 'Generic Station',
    county: 'Unknown',
    waterway: 'Unknown',
    thresholds: { actionStageFt: 12.0, minorFloodFt: 15.0, moderateFloodFt: 18.0, majorFloodFt: 21.0 },
  };

  const latest = history[history.length - 1];
  let rateOfRise = 0.0;

  if (history.length >= 2) {
    const previous = history[history.length - 2];
    const dtHours = (Date.parse(latest.timestamp) - Date.parse(previous.timestamp)) / (1000 * 60 * 60);
    if (dtHours > 0) {
      rateOfRise = (latest.heightFt - previous.heightFt) / dtHours;
    }
  }

  const severity = evaluateFloodSeverity(latest.heightFt, station.thresholds);

  return {
    siteId,
    timestamp: latest.timestamp,
    gageHeightFt: latest.heightFt,
    dischargeCfs: latestDischargeCfs,
    rateOfRiseFtPerHr: Math.round(rateOfRise * 100) / 100,
    severity,
  };
}

export function usgsGageTelemetryUrl(
  siteIds: string[] = Object.keys(NORTH_TEXAS_GAUGES),
  period = 'PT6H'
): string {
  const params = new URLSearchParams({
    format: 'json',
    sites: siteIds.join(','),
    parameterCd: '00065,00060',
    period,
  });
  return `https://waterservices.usgs.gov/nwis/iv/?${params.toString()}`;
}

export function parseUsgsDischargeLatest(payload: any, targetSiteId: string): number | null {
  const series = payload?.value?.timeSeries ?? [];
  for (const s of series) {
    const site = s.sourceInfo?.siteCode?.[0]?.value;
    const variable = s.variable?.variableCode?.[0]?.value;
    if (site !== targetSiteId || variable !== '00060') continue;
    const values = s.values?.[0]?.value ?? [];
    for (let i = values.length - 1; i >= 0; i--) {
      const val = parseFloat(values[i]?.value);
      if (Number.isFinite(val) && val >= 0) return val;
    }
  }
  return null;
}

export async function fetchUsgsGaugeTelemetry(
  siteIds: string[] = Object.keys(NORTH_TEXAS_GAUGES),
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    period?: string;
  } = {}
): Promise<GaugeTelemetryReading[]> {
  if (siteIds.length === 0) return [];
  const fetchFn = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(usgsGageTelemetryUrl(siteIds, options.period), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`USGS IV request failed with HTTP ${response.status}`);
    }
    const payload = await response.json();
    const readings: GaugeTelemetryReading[] = [];

    for (const siteId of siteIds) {
      const heightHistory = parseUsgsGageHeightSeries(payload, siteId);
      const latestDischarge = parseUsgsDischargeLatest(payload, siteId);
      const reading = analyzeStreamTelemetry(siteId, heightHistory, latestDischarge);
      if (reading) {
        readings.push(reading);
      }
    }
    return readings;
  } finally {
    clearTimeout(timer);
  }
}
