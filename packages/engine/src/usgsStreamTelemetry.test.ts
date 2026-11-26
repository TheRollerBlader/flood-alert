import { describe, expect, it, vi } from 'vitest';
import {
  evaluateFloodSeverity,
  parseUsgsGageHeightSeries,
  parseUsgsDischargeLatest,
  analyzeStreamTelemetry,
  usgsGageTelemetryUrl,
  fetchUsgsGaugeTelemetry,
  NORTH_TEXAS_GAUGES,
} from './usgsStreamTelemetry';

describe('usgsStreamTelemetry', () => {
  it('correctly evaluates flood stage severity transitions', () => {
    const thresholds = NORTH_TEXAS_GAUGES['08059800'].thresholds;
    expect(evaluateFloodSeverity(10.0, thresholds)).toBe('NORMAL');
    expect(evaluateFloodSeverity(14.2, thresholds)).toBe('ACTION');
    expect(evaluateFloodSeverity(16.5, thresholds)).toBe('MINOR');
    expect(evaluateFloodSeverity(19.8, thresholds)).toBe('MODERATE');
    expect(evaluateFloodSeverity(23.1, thresholds)).toBe('MAJOR');
  });

  it('parses raw USGS parameter 00065 gage height series', () => {
    const mockPayload = {
      value: {
        timeSeries: [
          {
            sourceInfo: { siteCode: [{ value: '08059800' }] },
            variable: { variableCode: [{ value: '00065' }] },
            values: [
              {
                value: [
                  { dateTime: '2026-11-12T10:00:00-06:00', value: '11.5' },
                  { dateTime: '2026-11-12T11:00:00-06:00', value: '14.8' },
                ],
              },
            ],
          },
        ],
      },
    };

    const parsed = parseUsgsGageHeightSeries(mockPayload, '08059800');
    expect(parsed).toHaveLength(2);
    expect(parsed[0].heightFt).toBe(11.5);
    expect(parsed[1].heightFt).toBe(14.8);
  });

  it('computes rate-of-rise trend and assigns station thresholds', () => {
    const history = [
      { timestamp: '2026-11-12T09:00:00Z', heightFt: 12.0 },
      { timestamp: '2026-11-12T11:00:00Z', heightFt: 16.5 }, // 4.5 ft over 2 hours = 2.25 ft/hr
    ];

    const reading = analyzeStreamTelemetry('08059800', history, 450);
    expect(reading).not.toBeNull();
    expect(reading?.siteId).toBe('08059800');
    expect(reading?.gageHeightFt).toBe(16.5);
    expect(reading?.dischargeCfs).toBe(450);
    expect(reading?.rateOfRiseFtPerHr).toBe(2.25);
    expect(reading?.severity).toBe('MINOR');
  });

  it('builds multi-parameter USGS URLs and fetches combined 00065/00060 telemetry', async () => {
    const url = usgsGageTelemetryUrl(['08059800', '08051500'], 'PT12H');
    expect(url).toContain('sites=08059800%2C08051500');
    expect(url).toContain('parameterCd=00065%2C00060');
    expect(url).toContain('period=PT12H');

    const mockResponse = {
      value: {
        timeSeries: [
          {
            sourceInfo: { siteCode: [{ value: '08059800' }] },
            variable: { variableCode: [{ value: '00065' }] },
            values: [
              {
                value: [
                  { dateTime: '2026-11-26T08:00:00Z', value: '13.5' },
                  { dateTime: '2026-11-26T09:00:00Z', value: '16.2' },
                ],
              },
            ],
          },
          {
            sourceInfo: { siteCode: [{ value: '08059800' }] },
            variable: { variableCode: [{ value: '00060' }] },
            values: [{ value: [{ dateTime: '2026-11-26T09:00:00Z', value: '820.0' }] }],
          },
        ],
      },
    };

    expect(parseUsgsDischargeLatest(mockResponse, '08059800')).toBe(820);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    })) as unknown as typeof fetch;

    const readings = await fetchUsgsGaugeTelemetry(['08059800'], { fetchImpl: fetchMock });
    expect(readings).toHaveLength(1);
    expect(readings[0].gageHeightFt).toBe(16.2);
    expect(readings[0].dischargeCfs).toBe(820);
    expect(readings[0].rateOfRiseFtPerHr).toBe(2.7);
    expect(readings[0].severity).toBe('MINOR');
  });
});
