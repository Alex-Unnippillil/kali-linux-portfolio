import { serializeTelemetryToCsv, WaveTelemetryRow } from "../../../apps/tower-defense";

describe("tower defense telemetry export", () => {
  it("includes header and formatted rows", () => {
    const rows: WaveTelemetryRow[] = [
      { wave: 2, leaks: 1, damage: 40, earned: 30, spent: 20 },
      { wave: 1, leaks: 0, damage: 10, earned: 5, spent: 15 },
    ];

    const csv = serializeTelemetryToCsv(rows);

    expect(csv.split("\n")[0]).toBe("Wave,Leaks,Tower Damage,Economy");
    expect(csv.split("\n").slice(1)).toEqual([
      "2,1,40,+30 / -20 (+10)",
      "1,0,10,+5 / -15 (-10)",
    ]);
  });

  it("returns only the header when there is no telemetry", () => {
    expect(serializeTelemetryToCsv([])).toBe("Wave,Leaks,Tower Damage,Economy");
  });
});
