/**
 * Strict type-safe USGS stream gauge and low-water crossing contract for flood-alert.
 * Scheduled Milestone: Architecture & Scaffolding (2026-11-23).
 */

export interface StreamGaugeAlarmContract {
  gaugeId: string;
  milestoneDate: string;
  streamName: string;
  stageHeightFeet: number;
  floodActionStageFeet: number;
  dischargeCfs: number;
  isHazardActive: boolean;
}

export function isStreamGaugeAlarm(obj: unknown): obj is StreamGaugeAlarmContract {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.gaugeId === 'string' &&
    typeof o.stageHeightFeet === 'number' &&
    typeof o.floodActionStageFeet === 'number' &&
    typeof o.isHazardActive === 'boolean' &&
    o.stageHeightFeet >= 0
  );
}
