import { describe, expect, it } from 'vitest';
import {
  type AlertContact,
  type HydrologyAlertPayload,
  filterEligibleRecipients,
  formatCrossingAlertMessage,
  isHydrologyAlertPayload,
  mapHazardToSeverity,
} from './alertSchema';
import type { CrossingPrediction } from './types';

describe('Flood Alert Notification Schema & Payload Validation', () => {
  it('correctly maps hazard status to broadcast alert severity', () => {
    expect(mapHazardToSeverity('clear')).toBe('advisory');
    expect(mapHazardToSeverity('watch')).toBe('watch');
    expect(mapHazardToSeverity('warning')).toBe('warning');
    expect(mapHazardToSeverity('severe')).toBe('warning');
    expect(mapHazardToSeverity('critical')).toBe('emergency');
  });

  it('validates a well-formed HydrologyAlertPayload with type guard', () => {
    const payload: HydrologyAlertPayload = {
      crossingId: 'prosper_coit_rowlett',
      crossingName: 'Coit Road at Rowlett Creek',
      city: 'Prosper',
      severity: 'emergency',
      hazardStatus: 'critical',
      currentDepthInches: 18.5,
      dischargeCfs: 1450.0,
      triggerTimeIso: new Date().toISOString(),
      message: '🚨 Roadway impassable',
      actionRequired: true,
    };
    expect(isHydrologyAlertPayload(payload)).toBe(true);
  });

  it('rejects invalid or negative numeric values in alert payloads', () => {
    const invalid = {
      crossingId: 'prosper_1',
      crossingName: 'Crossing 1',
      city: 'Prosper',
      severity: 'emergency',
      currentDepthInches: -5.0, // Negative depth is unphysical
      dischargeCfs: 100,
      message: 'test',
      actionRequired: true,
    };
    expect(isHydrologyAlertPayload(invalid)).toBe(false);
  });

  it('filters recipient contacts based on minimal severity threshold', () => {
    const contacts: AlertContact[] = [
      {
        id: '1',
        name: 'Public SMS',
        channel: 'sms',
        destination: '+19725550100',
        enabled: true,
        minSeverity: 'warning',
      },
      {
        id: '2',
        name: 'Emergency Dispatch',
        channel: 'webhook',
        destination: 'https://dispatch.local/webhook',
        enabled: true,
        minSeverity: 'emergency',
      },
      {
        id: '3',
        name: 'Weather Enthusiast',
        channel: 'push',
        destination: 'token123',
        enabled: true,
        minSeverity: 'watch',
      },
      {
        id: '4',
        name: 'Disabled Contact',
        channel: 'sms',
        destination: '+19725550199',
        enabled: false,
        minSeverity: 'advisory',
      },
    ];

    // Under 'watch', only Weather Enthusiast should receive
    const watchRecipients = filterEligibleRecipients(contacts, 'watch');
    expect(watchRecipients.map((c) => c.id)).toEqual(['3']);

    // Under 'warning', Public SMS and Weather Enthusiast receive
    const warningRecipients = filterEligibleRecipients(contacts, 'warning');
    expect(warningRecipients.map((c) => c.id)).toEqual(['1', '3']);

    // Under 'emergency', all enabled receive
    const emergencyRecipients = filterEligibleRecipients(contacts, 'emergency');
    expect(emergencyRecipients.map((c) => c.id)).toEqual(['1', '2', '3']);
  });

  it('formats emergency closure messages with clear turn-around warnings', () => {
    const samplePred: CrossingPrediction = {
      id: 'prosper_coit',
      name: 'Coit Road at Rowlett Creek',
      road: 'Coit Rd',
      creek: 'Rowlett Creek',
      city: 'Prosper',
      latitude: 33.24,
      longitude: -96.79,
      placeDetail: 'Bridge crossing',
      lwxType: 'low_water_crossing',
      sourceObjectId: 1,
      gaugeId: '08051500',
      gaugeName: 'Rowlett Creek near Frisco',
      gaugeNote: '',
      depthFt: 1.5,
      depthInches: 18.0,
      status: 'critical',
      statusLabel: 'CRITICAL',
      vehicleNote: 'Roadway impassable',
      dischargeCfs: 2100,
      dischargeAt: new Date().toISOString(),
      rainfallInches: 2.1,
      rainfallLabel: 'Heavy',
      rainfallNote: null,
      updatedAt: new Date().toISOString(),
      mode: 'live',
      disclaimer: '',
    };

    const msg = formatCrossingAlertMessage(samplePred);
    expect(msg).toContain('EMERGENCY ROAD CLOSURE');
    expect(msg).toContain('IMPASSABLE');
    expect(msg).toContain('Turn around, don\'t drown');
  });
});
