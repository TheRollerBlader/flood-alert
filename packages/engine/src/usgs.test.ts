import { describe, expect, it } from "vitest";
import { parseUsgsSeries, selectDischarge } from "./usgs";

const fixture = {
  value: {
    timeSeries: [
      {
        sourceInfo: {
          siteCode: [{ value: "08059590" }],
        },
        variable: {
          variableCode: [{ value: "00060" }],
        },
        values: [
          {
            value: [
              { value: "3.10", dateTime: "2026-10-24T21:00:00.000-05:00" },
              { value: "4.00", dateTime: "2026-10-24T22:00:00.000-05:00" },
              { value: "-999999", dateTime: "2026-10-24T22:15:00.000-05:00" },
            ],
          },
        ],
      },
    ],
  },
};

describe("USGS discharge", () => {
  it("drops sentinel values and keeps the discharge series", () => {
    const series = parseUsgsSeries(fixture);
    expect(series.get("08059590")).toEqual([
      { timeMs: Date.parse("2026-10-24T21:00:00.000-05:00"), cfs: 3.1 },
      { timeMs: Date.parse("2026-10-24T22:00:00.000-05:00"), cfs: 4 },
    ]);
  });

  it("picks the sample nearest the lagged time", () => {
    const samples = parseUsgsSeries(fixture).get("08059590") ?? [];
    const target = Date.parse("2026-10-24T21:10:00.000-05:00");
    expect(selectDischarge(samples, target)?.cfs).toBe(3.1);
  });

  it("rejects a sample more than three hours from the target", () => {
    const samples = parseUsgsSeries(fixture).get("08059590") ?? [];
    const target = Date.parse("2026-10-24T10:00:00.000-05:00");
    expect(selectDischarge(samples, target)).toBeNull();
  });
});
