export interface RainSample {
  startMs: number;
  endMs: number;
  inches: number;
}

const NWS_HEADERS = {
  "User-Agent": "FloodAlertApp/1.0 (Collin County low-water alert; local demo)",
  Accept: "application/geo+json, application/json",
};

export function durationMs(duration: string): number | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(duration);
  if (!match) return null;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const total = ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
  return total > 0 ? total : null;
}

export function toInches(value: number, uom: string): number {
  const unit = uom.toLowerCase();
  if (unit.includes("mm")) return value / 25.4;
  return value;
}

export function parseRainSamples(payload: unknown): RainSample[] {
  if (!payload || typeof payload !== "object") return [];
  const properties = (payload as { properties?: Record<string, unknown> }).properties ?? payload;
  const layer = (properties as { quantitativePrecipitation?: unknown }).quantitativePrecipitation;
  if (!layer || typeof layer !== "object") return [];
  const uom = String((layer as { uom?: string }).uom ?? "wmoUnit:mm");
  const values = (layer as { values?: { validTime?: string; value?: number | null }[] }).values ?? [];
  const samples: RainSample[] = [];
  for (const entry of values) {
    if (!entry.validTime || entry.value == null || !Number.isFinite(entry.value)) continue;
    const [startText, duration] = entry.validTime.split("/");
    const startMs = Date.parse(startText ?? "");
    const length = duration ? durationMs(duration) : null;
    if (!Number.isFinite(startMs) || length == null) continue;
    samples.push({
      startMs,
      endMs: startMs + length,
      inches: Math.max(0, toInches(entry.value, uom)),
    });
  }
  return samples;
}

export function rainfallInWindow(samples: RainSample[], nowMs: number, windowHours: number): number {
  const windowEnd = nowMs + windowHours * 60 * 60 * 1000;
  let inches = 0;
  for (const sample of samples) {
    const overlap = Math.min(sample.endMs, windowEnd) - Math.max(sample.startMs, nowMs);
    const duration = sample.endMs - sample.startMs;
    if (overlap <= 0 || duration <= 0) continue;
    inches += sample.inches * (overlap / duration);
  }
  return inches;
}

export function readForecastGridUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const url = (payload as { properties?: { forecastGridData?: string } }).properties?.forecastGridData;
  return typeof url === "string" && url.startsWith("https://api.weather.gov/") ? url : null;
}

export async function fetchRainSamples(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch,
): Promise<RainSample[]> {
  const pointUrl = `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const pointResponse = await fetchImpl(pointUrl, { headers: NWS_HEADERS });
  if (!pointResponse.ok) throw new Error(`NWS points ${pointResponse.status}`);
  const gridUrl = readForecastGridUrl(await pointResponse.json());
  if (!gridUrl) throw new Error("NWS grid URL missing");
  const gridResponse = await fetchImpl(gridUrl, { headers: NWS_HEADERS });
  if (!gridResponse.ok) throw new Error(`NWS grid ${gridResponse.status}`);
  return parseRainSamples(await gridResponse.json());
}
