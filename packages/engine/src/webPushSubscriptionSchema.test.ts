/**
 * Web Push subscription schema and notification payload validation tests.
 * Scheduled Milestone: Type Safety, Linting & Polish (2026-11-14).
 */

import { describe, expect, it } from 'vitest';
import {
  isWebPushSubscription,
  buildWebPushPayload,
  isSubscriberEligible,
  type WebPushSubscription,
} from './webPushSubscriptionSchema';
import type { HydrologyAlertPayload } from './alertSchema';

describe('WebPushSubscriptionSchema & Notification Builder', () => {
  const validSub: WebPushSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/sample_push_token_abc123',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9bP0nEgl14uJY1TRq86_VIIGX3ET0849VENq7CSx078YPw',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
    userCityFilter: 'Prosper',
    minSeverityThreshold: 'warning',
  };

  const sampleAlert: HydrologyAlertPayload = {
    crossingId: 'prosper_coit_rowlett',
    crossingName: 'Coit Rd at Rowlett Creek',
    city: 'Prosper',
    severity: 'emergency',
    hazardStatus: 'critical',
    currentDepthInches: 22.0,
    dischargeCfs: 3200,
    triggerTimeIso: new Date().toISOString(),
    message: 'Roadway impassable. Turn around, do not drown.',
    actionRequired: true,
  };

  describe('isWebPushSubscription type guard', () => {
    it('accepts standard W3C compliant subscription with valid keys', () => {
      expect(isWebPushSubscription(validSub)).toBe(true);
    });

    it('rejects subscriptions missing https endpoint or keys', () => {
      expect(isWebPushSubscription({ endpoint: 'http://insecure.url', keys: validSub.keys })).toBe(false);
      expect(isWebPushSubscription({ endpoint: validSub.endpoint, keys: {} })).toBe(false);
      expect(isWebPushSubscription(null)).toBe(false);
      expect(isWebPushSubscription('invalid_string')).toBe(false);
    });
  });

  describe('buildWebPushPayload', () => {
    it('constructs urgent action-oriented payload for emergency severity alerts', () => {
      const payload = buildWebPushPayload(sampleAlert);

      expect(payload.title).toContain('🚨 EMERGENCY CLOSURE');
      expect(payload.title).toContain('Coit Rd at Rowlett Creek');
      expect(payload.body).toContain('22.0" depth');
      expect(payload.body).toContain('3200 cfs');
      expect(payload.requireInteraction).toBe(true);
      expect(payload.data.crossingId).toBe('prosper_coit_rowlett');
      expect(payload.actions).toHaveLength(2);
    });
  });

  describe('isSubscriberEligible filtering', () => {
    it('allows subscribers matching city and severity criteria', () => {
      expect(isSubscriberEligible(validSub, sampleAlert)).toBe(true);
    });

    it('blocks subscribers when alert city does not match subscriber preference', () => {
      const mckinneyAlert: HydrologyAlertPayload = {
        ...sampleAlert,
        city: 'McKinney',
      };
      expect(isSubscriberEligible(validSub, mckinneyAlert)).toBe(false);
    });

    it('blocks subscribers when alert severity is below subscriber threshold', () => {
      const minorWatchAlert: HydrologyAlertPayload = {
        ...sampleAlert,
        severity: 'watch',
      };
      // validSub has minSeverityThreshold: 'warning'
      expect(isSubscriberEligible(validSub, minorWatchAlert)).toBe(false);
    });
  });
});
