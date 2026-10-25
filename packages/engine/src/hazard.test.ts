import { describe, expect, it } from "vitest";
import { classifyDepth } from "./hazard";

describe("classifyDepth", () => {
  it("keeps depths under 0.1 ft clear", () => {
    expect(classifyDepth(0)).toBe("clear");
    expect(classifyDepth(0.099)).toBe("clear");
  });

  it("starts watch at 0.1 ft and holds it under 0.5 ft", () => {
    expect(classifyDepth(0.1)).toBe("watch");
    expect(classifyDepth(0.3)).toBe("watch");
    expect(classifyDepth(0.499)).toBe("watch");
  });

  it("starts warning at 0.5 ft", () => {
    expect(classifyDepth(0.5)).toBe("warning");
    expect(classifyDepth(0.999)).toBe("warning");
  });

  it("starts severe at 1 ft", () => {
    expect(classifyDepth(1)).toBe("severe");
    expect(classifyDepth(1.999)).toBe("severe");
  });

  it("starts critical at 2 ft", () => {
    expect(classifyDepth(2)).toBe("critical");
    expect(classifyDepth(3.4)).toBe("critical");
  });
});
