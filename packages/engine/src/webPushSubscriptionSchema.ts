/**
 * Strict TypeScript types, VAPID contracts, and runtime type guards
 * for W3C Push API subscriptions and North Texas flood push notifications.
 * Scheduled Milestone: Type Safety, Linting & Polish (2026-11-14).
 */

import type { HydrologyAlertPayload, AlertSeverity } from './alertSchema';

export interface PushSubscriptionKeys {
  readonly p256dh: string;
  readonly auth: string;
}

export interface WebPushSubscription {
  readonly endpoint: string;
  readonly expirationTime?: number | null;
  readonly keys: PushSubscriptionKeys;
  readonly createdAtIso?: string;
  readonly userCityFilter?: 'Prosper' | 'Frisco' | 'McKinney' | 'all';
  readonly minSeverityThreshold?: AlertSeverity;
}

export interface WebPushNotificationAction {
  readonly action: string;
  readonly title: string;
  readonly icon?: string;
}

export interface WebPushNotificationPayload {
  readonly title: string;
  readonly body: string;
  readonly icon: string;
  readonly badge: string;
  readonly tag: string;
  readonly timestamp: number;
  readonly data: {
    readonly url: string;
    readonly crossingId: string;
    readonly severity: AlertSeverity;
    readonly depthInches: number;
  };
  readonly requireInteraction: boolean;
  readonly actions?: readonly WebPushNotificationAction[];
}

/**
 * Validates whether an unknown value conforms strictly to the W3C WebPushSubscription contract.
 */
export function isWebPushSubscription(val: unknown): val is WebPushSubscription {
  if (!val || typeof val !== 'object') return false;
  const s = val as Record<string, unknown>;

  if (typeof s.endpoint !== 'string' || !s.endpoint.startsWith('https://')) {
    return false;
  }

  if (!s.keys || typeof s.keys !== 'object') return false;
  const k = s.keys as Record<string, unknown>;

  if (typeof k.p256dh !== 'string' || k.p256dh.trim().length === 0) return false;
  if (typeof k.auth !== 'string' || k.auth.trim().length === 0) return false;

  if (s.expirationTime !== undefined && s.expirationTime !== null && typeof s.expirationTime !== 'number') {
    return false;
  }

  return true;
}

/**
 * Constructs a strict, compliant WebPushNotificationPayload from a triggered HydrologyAlertPayload.
 */
export function buildWebPushPayload(
  alert: HydrologyAlertPayload,
  baseUrl = 'https://flood-alert.prosper.tx'
): WebPushNotificationPayload {
  const isUrgent = alert.severity === 'emergency' || alert.severity === 'warning';
  const titlePrefix = alert.severity === 'emergency' ? '🚨 EMERGENCY CLOSURE'
    : alert.severity === 'warning' ? '⚠️ FLOOD WARNING'
    : 'ℹ️ FLOOD ADVISORY';

  const title = `${titlePrefix}: ${alert.crossingName}`;
  const body = `${alert.city} crossing hazard: ${alert.currentDepthInches.toFixed(1)}" depth, ${alert.dischargeCfs.toFixed(0)} cfs. ${alert.message}`;

  return {
    title,
    body,
    icon: `${baseUrl}/icons/icon-192x192.png`,
    badge: `${baseUrl}/icons/badge-72x72.png`,
    tag: `flood-${alert.crossingId}`,
    timestamp: Date.now(),
    requireInteraction: isUrgent,
    data: {
      url: `${baseUrl}/crossing/${alert.crossingId}`,
      crossingId: alert.crossingId,
      severity: alert.severity,
      depthInches: alert.currentDepthInches,
    },
    actions: [
      { action: 'view_map', title: '🗺️ View Map' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
}

/**
 * Evaluates whether a push subscriber is eligible to receive a given alert based on city and severity filter.
 */
export function isSubscriberEligible(
  sub: WebPushSubscription,
  alert: HydrologyAlertPayload
): boolean {
  if (sub.userCityFilter && sub.userCityFilter !== 'all' && sub.userCityFilter !== alert.city) {
    return false;
  }

  const severityOrder: Record<AlertSeverity, number> = {
    advisory: 1,
    watch: 2,
    warning: 3,
    emergency: 4,
  };

  const minLevel = sub.minSeverityThreshold ? severityOrder[sub.minSeverityThreshold] : 2;
  const alertLevel = severityOrder[alert.severity];

  return alertLevel >= minLevel;
}
