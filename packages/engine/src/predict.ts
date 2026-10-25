import { cached } from "./cache";
import { CROSSINGS, findCrossing } from "./crossings";
import { classifyDepth } from "./hazard";
import { dischargeForDepth, predictDepth } from "./hydrology";
import { fetchRainSamples, rainfallInWindow, type RainSample } from "./nws";
import { DISCLAIMER, STATUS_STYLES } from "./presentation";
import type { Crossing, CrossingPrediction, Mode } from "./types";
import { parseUsgsSeries, selectDischarge, usgsUrl } from "./usgs";

export interface PredictOptions {
  now?: Date;
  fetchImpl?: typeof fetch;
}

export function parseMode(value: string | null | undefined): Mode | null {
  if (value == null || value === "" || value === "live") return "live";
  if (value === "demo") return "demo";
  return null;
}

export async function predictCrossings(
  mode: Mode,
  options: PredictOptions = {},
): Promise<CrossingPrediction[]> {
  const now = options.now ?? new Date();
  if (mode === "demo") return CROSSINGS.map((crossing) => predictDemo(crossing, now));
  const context = await loadLiveContext(options.fetchImpl ?? fetch);
  return CROSSINGS.map((crossing) => predictLive(crossing, now, context));
}

export async function predictCrossing(
  id: string,
  mode: Mode,
  options: PredictOptions = {},
): Promise<CrossingPrediction | null> {
  const crossing = findCrossing(id);
  if (!crossing) return null;
  const now = options.now ?? new Date();
  if (mode === "demo") return predictDemo(crossing, now);
  const context = await loadLiveContext(options.fetchImpl ?? fetch);
  return predictLive(crossing, now, context);
}

interface LiveContext {
  discharge: Map<string, { timeMs: number; cfs: number }[]>;
  rainfall: Map<string, RainSample[] | null>;
}

async function loadLiveContext(fetchImpl: typeof fetch): Promise<LiveContext> {
  const gaugeIds = [...new Set(CROSSINGS.map((crossing) => crossing.gaugeId))];
  const locations = uniqueLocations();
  const [discharge, rainfallEntries] = await Promise.all([
    cached(`usgs:${gaugeIds.join(",")}`, () => loadDischarge(gaugeIds, fetchImpl)),
    Promise.all(
      locations.map(async (location) => {
        const samples = await cached(`nws:${location.key}`, async () => {
          try {
            return await fetchRainSamples(location.latitude, location.longitude, fetchImpl);
          } catch {
            return null;
          }
        });
        return [location.key, samples] as const;
      }),
    ),
  ]);
  return {
    discharge,
    rainfall: new Map(rainfallEntries),
  };
}

async function loadDischarge(gaugeIds: string[], fetchImpl: typeof fetch) {
  try {
    const response = await fetchImpl(usgsUrl(gaugeIds));
    if (!response.ok) return new Map();
    return parseUsgsSeries(await response.json());
  } catch {
    return new Map();
  }
}

function uniqueLocations(): { key: string; latitude: number; longitude: number }[] {
  const seen = new Map<string, { key: string; latitude: number; longitude: number }>();
  for (const crossing of CROSSINGS) {
    const key = locationKey(crossing);
    if (!seen.has(key)) {
      seen.set(key, { key, latitude: crossing.latitude, longitude: crossing.longitude });
    }
  }
  return [...seen.values()];
}

function locationKey(crossing: Crossing): string {
  return `${crossing.latitude.toFixed(4)},${crossing.longitude.toFixed(4)}`;
}

function predictDemo(crossing: Crossing, now: Date): CrossingPrediction {
  const dischargeCfs = dischargeForDepth({
    depthFt: crossing.demoDepthFt,
    qBaseCfs: crossing.qBaseCfs,
    alpha: crossing.alpha,
    beta: crossing.beta,
  });
  const depthFt = predictDepth({
    dischargeCfs,
    qBaseCfs: crossing.qBaseCfs,
    alpha: crossing.alpha,
    beta: crossing.beta,
    gamma: crossing.gamma,
    rainfallInches: 0,
  });
  return finish(crossing, {
    mode: "demo",
    depthFt,
    dischargeCfs,
    dischargeAt: now.toISOString(),
    rainfallInches: 0,
    rainfallLabel: "Scripted rainfall (demo)",
    rainfallNote: "Demo storm uses scripted discharge and no rainfall.",
    updatedAt: now.toISOString(),
  });
}

function predictLive(crossing: Crossing, now: Date, context: LiveContext): CrossingPrediction {
  const target = now.getTime() - crossing.lagMinutes * 60 * 1000;
  const sample = selectDischarge(context.discharge.get(crossing.gaugeId) ?? [], target);
  const rainSamples = context.rainfall.get(locationKey(crossing));
  const rainfallMissing = rainSamples == null;
  const rainfallInches = rainfallMissing
    ? null
    : rainfallInWindow(rainSamples, now.getTime(), crossing.rainfallWindowHours);

  if (!sample) {
    return finish(crossing, {
      mode: "live",
      depthFt: null,
      dischargeCfs: null,
      dischargeAt: null,
      rainfallInches,
      rainfallLabel: "NWS forecast rainfall",
      rainfallNote: rainfallMissing
        ? "Forecast rainfall was unavailable."
        : null,
      updatedAt: now.toISOString(),
    });
  }

  const depthFt = predictDepth({
    dischargeCfs: sample.cfs,
    qBaseCfs: crossing.qBaseCfs,
    alpha: crossing.alpha,
    beta: crossing.beta,
    gamma: crossing.gamma,
    rainfallInches: rainfallInches ?? 0,
  });

  return finish(crossing, {
    mode: "live",
    depthFt,
    dischargeCfs: sample.cfs,
    dischargeAt: new Date(sample.timeMs).toISOString(),
    rainfallInches,
    rainfallLabel: "NWS forecast rainfall",
    rainfallNote: rainfallMissing
      ? "Depth uses discharge only because forecast rainfall was unavailable."
      : "Rainfall is the NWS forecast accumulation over the next 6 hours, not observed radar.",
    updatedAt: new Date(sample.timeMs).toISOString(),
  });
}

function finish(
  crossing: Crossing,
  values: Omit<
    CrossingPrediction,
    | keyof Pick<
        Crossing,
        | "id"
        | "name"
        | "road"
        | "creek"
        | "city"
        | "latitude"
        | "longitude"
        | "placeDetail"
        | "lwxType"
        | "sourceObjectId"
        | "gaugeId"
        | "gaugeName"
        | "gaugeNote"
      >
    | "depthInches"
    | "status"
    | "statusLabel"
    | "vehicleNote"
    | "disclaimer"
  >,
): CrossingPrediction {
  const status = values.depthFt == null ? "unknown" : classifyDepth(values.depthFt);
  const style = STATUS_STYLES[status];
  return {
    id: crossing.id,
    name: crossing.name,
    road: crossing.road,
    creek: crossing.creek,
    city: crossing.city,
    latitude: crossing.latitude,
    longitude: crossing.longitude,
    placeDetail: crossing.placeDetail,
    lwxType: crossing.lwxType,
    sourceObjectId: crossing.sourceObjectId,
    gaugeId: crossing.gaugeId,
    gaugeName: crossing.gaugeName,
    gaugeNote: crossing.gaugeNote,
    depthFt: values.depthFt,
    depthInches: values.depthFt == null ? null : values.depthFt * 12,
    status,
    statusLabel: style.label,
    vehicleNote: style.vehicleNote,
    dischargeCfs: values.dischargeCfs,
    dischargeAt: values.dischargeAt,
    rainfallInches: values.rainfallInches,
    rainfallLabel: values.rainfallLabel,
    rainfallNote: values.rainfallNote,
    updatedAt: values.updatedAt,
    mode: values.mode,
    disclaimer: DISCLAIMER,
  };
}
