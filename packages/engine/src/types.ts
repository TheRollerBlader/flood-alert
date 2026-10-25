export type Mode = "live" | "demo";

export type HazardStatus = "clear" | "watch" | "warning" | "severe" | "critical";

export type DisplayStatus = HazardStatus | "unknown";

export interface GaugeModel {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  qBaseCfs: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface Crossing {
  id: string;
  name: string;
  road: string;
  creek: string;
  city: "Prosper" | "Frisco" | "McKinney";
  latitude: number;
  longitude: number;
  placeDetail: string;
  lwxType: string;
  sourceObjectId: number;
  gaugeId: string;
  gaugeName: string;
  gaugeNote: string;
  alpha: number;
  beta: number;
  gamma: number;
  qBaseCfs: number;
  lagMinutes: number;
  rainfallWindowHours: number;
  demoDepthFt: number;
}

export interface CrossingPrediction {
  id: string;
  name: string;
  road: string;
  creek: string;
  city: Crossing["city"];
  latitude: number;
  longitude: number;
  placeDetail: string;
  lwxType: string;
  sourceObjectId: number;
  gaugeId: string;
  gaugeName: string;
  gaugeNote: string;
  depthFt: number | null;
  depthInches: number | null;
  status: DisplayStatus;
  statusLabel: string;
  vehicleNote: string;
  dischargeCfs: number | null;
  dischargeAt: string | null;
  rainfallInches: number | null;
  rainfallLabel: string;
  rainfallNote: string | null;
  updatedAt: string;
  mode: Mode;
  disclaimer: string;
}

export interface DischargeSample {
  timeMs: number;
  cfs: number;
}
