import { describe, expect, it } from "vitest";
import { classifyDepth } from "./hazard";
import { predictDepth } from "./hydrology";

const base = {
  qBaseCfs: 75,
  alpha: 0.004,
  beta: 1,
  gamma: 0.12,
};

describe("predictDepth", () => {
  it("stays clear when discharge is at baseflow and rain is zero", () => {
    const depth = predictDepth({ ...base, dischargeCfs: 75, rainfallInches: 0 });
    expect(depth).toBe(0);
    expect(classifyDepth(depth)).toBe("clear");
  });

  it("ignores discharge below baseflow", () => {
    const depth = predictDepth({ ...base, dischargeCfs: 10, rainfallInches: 0 });
    expect(depth).toBe(0);
  });

  it("adds rainfall on top of excess discharge", () => {
    const depth = predictDepth({ ...base, dischargeCfs: 100, rainfallInches: 1 });
    expect(depth).toBeCloseTo(0.004 * 25 + 0.12, 6);
  });

  it("does not produce a negative depth", () => {
    expect(
      predictDepth({ ...base, dischargeCfs: 0, rainfallInches: 0 }),
    ).toBe(0);
  });
});
