import { clampLevel, formatTime } from "../components/ui/BatteryIndicator";

describe("clampLevel", () => {
  it("keeps values within the 0-1 range", () => {
    expect(clampLevel(-0.2)).toBe(0);
    expect(clampLevel(0.45)).toBeCloseTo(0.45);
    expect(clampLevel(1.5)).toBe(1);
  });
});

describe("formatTime", () => {
  it("formats seconds to hours and minutes", () => {
    expect(formatTime(3600)).toBe("1h 0m");
    expect(formatTime(3660)).toBe("1h 1m");
    expect(formatTime(60)).toBe("1m");
  });

  it("handles zero or non-finite values", () => {
    expect(formatTime(0)).toBeNull();
    expect(formatTime(Infinity)).toBeNull();
  });
});

