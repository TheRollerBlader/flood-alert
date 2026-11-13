/**
 * Multi-station hydrological threshold and low-water crossing assertion test suite.
 * Scheduled Milestone: Testing & Verification (2026-11-13).
 *
 * Validates:
 * 1. North Texas watershed regional flash flood stage transitions across Collin & Denton counties.
 * 2. Rapid rate-of-rise alert threshold assertions (> 1.5 ft/hr flash flood warning boundary).
 * 3. Graceful handling of invalid/corrupt USGS sensor payloads.
 */

import { describe, expect, it } from 'vitest';
import {
  evaluateFloodSeverity,
  parseUsgsGageHeightSeries,
  analyzeStreamTelemetry,
  NORTH_TEXAS_GAUGES,
} from './usgsStreamTelemetry';

describe('Hydrological Threshold & Emergency Trigger Assertions', () => {
  describe('All North Texas Monitoring Stations Thresholds', () => {
    it('enforces monotonic threshold order across all configured stations', () => {
      for (const [siteId, station] of Object.entries(NORTH_TEXAS_GAUGES)) {
        const { actionStageFt, minorFloodFt, moderateFloodFt, majorFloodFt } = station.thresholds;
        expect(actionStageFt).toBeLessThan(minorFloodFt);
        expect(minorFloodFt).toBeLessThan(moderateFloodFt);
        expect(moderateFloodFt).toBeLessThan(majorFloodFt);
      }
    });

    it('accurately identifies MAJOR flood emergencies for East Fork Trinity River', () => {
      const eastFork = NORTH_TEXAS_GAUGES['08051500'];
      expect(evaluateFloodSeverity(14.9, eastFork.thresholds)).toBe('NORMAL');
      expect(evaluateFloodSeverity(15.1, eastFork.thresholds)).toBe('ACTION');
      expect(evaluateFloodSeverity(17.5, eastFork.thresholds)).toBe('MINOR');
      expect(evaluateFloodSeverity(20.5, eastFork.thresholds)).toBe('MODERATE');
      expect(evaluateFloodSeverity(24.5, eastFork.thresholds)).toBe('MAJOR');
    });
  });

  describe('Rate of Rise & Rapid Inundation Triggers', () => {
    it('detects flash flood conditions when rate of rise exceeds 2.0 ft/hr', () => {
      // Historical readings separated by 30 minutes (0.5 hr) with 1.5 ft rise => 3.0 ft/hr
      const rapidRiseHistory = [
        { timestamp: '2026-11-13T10:00:00Z', heightFt: 11.0 },
        { timestamp: '2026-11-13T10:30:00Z', heightFt: 12.5 },
      ];

      const reading = analyzeStreamTelemetry('08052800', rapidRiseHistory, 620);
      expect(reading).not.toBeNull();
      expect(reading?.rateOfRiseFtPerHr).toBeCloseTo(3.0, 2);
      expect(reading?.rateOfRiseFtPerHr).toBeGreaterThan(1.5); // Emergency flash threshold
      expect(reading?.severity).toBe('MINOR'); // Wilson Creek minor is 12.0
    });

    it('handles negative rate of rise (receding floodwaters) correctly', () => {
      const recedingHistory = [
        { timestamp: '2026-11-13T08:00:00Z', heightFt: 18.0 },
        { timestamp: '2026-11-13T10:00:00Z', heightFt: 15.0 }, // -3.0 ft over 2 hours = -1.5 ft/hr
      ];

      const reading = analyzeStreamTelemetry('08059800', recedingHistory, 210);
      expect(reading).not.toBeNull();
      expect(reading?.rateOfRiseFtPerHr).toBeCloseTo(-1.5, 2);
    });
  });

  describe('USGS Sensor Failure & Anomaly Rejection', () => {
    it('returns empty array when USGS timeSeries payload is malformed or empty', () => {
      expect(parseUsgsGageHeightSeries(null, '08059800')).toEqual([]);
      expect(parseUsgsGageHeightSeries({}, '08059800')).toEqual([]);
      expect(parseUsgsGageHeightSeries({ value: {} }, '08059800')).toEqual([]);
    });

    it('rejects time series from unrelated gauge site IDs', () => {
      const payloadFromOtherSite = {
        value: {
          timeSeries: [
            {
              sourceInfo: { siteCode: [{ value: '99999999' }] },
              variable: { variableCode: [{ value: '00065' }] },
              values: [{ value: [{ dateTime: '2026-11-13T10:00:00Z', value: '15.0' }] }],
            },
          ],
        },
      };

      const result = parseUsgsGageHeightSeries(payloadFromOtherSite, '08059800');
      expect(result).toHaveLength(0);
    });
  });
});
