import { clampLevel, estimateBatteryTime } from "../components/ui/BatteryIndicator";

describe("clampLevel", () => {
  it("keeps values within the 0-1 range", () => {
    expect(clampLevel(-0.2)).toBe(0);
    expect(clampLevel(0.45)).toBeCloseTo(0.45);
    expect(clampLevel(1.5)).toBe(1);
  });
});

describe("estimateBatteryTime", () => {
  it("estimates remaining discharge time", () => {
    expect(estimateBatteryTime(0.75, false)).toBe("2h 15m remaining");
  });

  it("estimates time until full when charging", () => {
    expect(estimateBatteryTime(0.75, true)).toBe("30m until full");
  });

  it("reports a full battery when level is maxed", () => {
    expect(estimateBatteryTime(1, true)).toBe("Fully charged");
  });

  it("reports depletion when the battery is empty", () => {
    expect(estimateBatteryTime(0, false)).toBe("Battery depleted");
  });
});
