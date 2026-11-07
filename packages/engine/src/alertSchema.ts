/**
 * Strict runtime type validation and schema definitions for flood alerts,
 * threshold triggers, and emergency notification payloads.
 *
 * Implements Week 1 Milestone: Saturday - Type Safety, Linting & Polish.
 */

import type { CrossingPrediction, HazardStatus } from './types';

export type AlertSeverity = 'advisory' | 'watch' | 'warning' | 'emergency';

export interface AlertContact {
  id: string;
  name: string;
  channel: 'sms' | 'push' | 'webhook';
  destination: string;
  enabled: boolean;
  minSeverity: AlertSeverity;
}

export interface HydrologyAlertPayload {
  crossingId: string;
  crossingName: string;
  city: 'Prosper' | 'Frisco' | 'McKinney';
  severity: AlertSeverity;
  hazardStatus: HazardStatus;
  currentDepthInches: number;
  dischargeCfs: number;
  triggerTimeIso: string;
  message: string;
  actionRequired: boolean;
}

const SEVERITY_LEVELS: Record<AlertSeverity, number> = {
  advisory: 1,
  watch: 2,
  warning: 3,
  emergency: 4,
};

const HAZARD_TO_SEVERITY: Record<HazardStatus, AlertSeverity> = {
  clear: 'advisory',
  watch: 'watch',
  warning: 'warning',
  severe: 'warning',
  critical: 'emergency',
};

/**
 * Maps model hazard status into standardized emergency broadcast alert severity.
 */
export function mapHazardToSeverity(hazard: HazardStatus): AlertSeverity {
  return HAZARD_TO_SEVERITY[hazard] || 'advisory';
}

/**
 * Formats a clear, actionable text alert for low-water crossings.
 */
export function formatCrossingAlertMessage(pred: CrossingPrediction): string {
  const depth = pred.depthInches !== null ? `${pred.depthInches.toFixed(1)}"` : 'unknown';
  const cfs = pred.dischargeCfs !== null ? `${Math.round(pred.dischargeCfs)} cfs` : 'unknown flow';

  if (pred.status === 'critical' || pred.status === 'severe') {
    return `🚨 EMERGENCY ROAD CLOSURE: ${pred.name} (${pred.road} at ${pred.creek}, ${pred.city}) is IMPASSABLE. Water depth: ${depth} (${cfs}). Turn around, don't drown.`;
  }
  if (pred.status === 'warning') {
    return `⚠️ FLOOD WARNING: ${pred.name} (${pred.city}) experiencing active water over roadway (${depth}). High-clearance vehicles only.`;
  }
  if (pred.status === 'watch') {
    return `ℹ️ FLOOD WATCH: Rising stream gauge detected near ${pred.name} (${pred.city}). Monitor conditions closely.`;
  }
  return `✅ ROADWAY CLEAR: ${pred.name} (${pred.city}) normal flow conditions.`;
}

/**
 * Runtime type guard verifying HydrologyAlertPayload integrity.
 */
export function isHydrologyAlertPayload(obj: unknown): obj is HydrologyAlertPayload {
  if (!obj || typeof obj !== 'object') return false;
  const a = obj as Record<string, unknown>;

  if (typeof a.crossingId !== 'string' || a.crossingId.trim().length === 0) return false;
  if (typeof a.crossingName !== 'string' || a.crossingName.trim().length === 0) return false;

  const validCities = ['Prosper', 'Frisco', 'McKinney'];
  if (!validCities.includes(a.city as string)) return false;

  const validSeverities = ['advisory', 'watch', 'warning', 'emergency'];
  if (!validSeverities.includes(a.severity as string)) return false;

  if (typeof a.currentDepthInches !== 'number' || !Number.isFinite(a.currentDepthInches) || a.currentDepthInches < 0) {
    return false;
  }

  if (typeof a.dischargeCfs !== 'number' || !Number.isFinite(a.dischargeCfs) || a.dischargeCfs < 0) {
    return false;
  }

  if (typeof a.message !== 'string' || a.message.trim().length === 0) return false;
  if (typeof a.actionRequired !== 'boolean') return false;

  return true;
}

/**
 * Filters contacts that should be notified based on threshold severity level.
 */
export function filterEligibleRecipients(contacts: AlertContact[], severity: AlertSeverity): AlertContact[] {
  const targetLevel = SEVERITY_LEVELS[severity];
  return contacts.filter((c) => c.enabled && SEVERITY_LEVELS[c.minSeverity] <= targetLevel);
}
