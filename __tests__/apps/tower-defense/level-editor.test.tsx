import {
  deserializeLevel,
  serializeLevel,
  LevelData,
} from "../../../apps/tower-defense";

describe("tower defense level serialization", () => {
  it("round-trips structured level data", () => {
    const level: LevelData = {
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
      spawners: [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
      ],
      towers: [
        { x: 3, y: 3, range: 2, damage: 3, level: 2 },
        { x: 4, y: 4, range: 1.5, damage: 2, level: 1 },
      ],
      waves: [
        { name: "Opening", spawns: [{ spawner: 1, type: "fast", count: 2 }] },
        { name: "Second", spawns: [{ spawner: 0, type: "tank", count: 1 }] },
      ],
    };

    const json = serializeLevel(level);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual({
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
      spawners: [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
      ],
      towers: [
        { x: 3, y: 3, range: 2, damage: 3, level: 2 },
        { x: 4, y: 4, range: 1.5, damage: 2, level: 1 },
      ],
      waves: [
        { name: "Opening", spawns: [{ spawner: 1, type: "fast", count: 2 }] },
        { name: "Second", spawns: [{ spawner: 0, type: "tank", count: 1 }] },
      ],
    });

    expect(deserializeLevel(json)).toEqual(parsed);
  });

  it("normalizes incomplete or legacy level definitions", () => {
    const raw = JSON.stringify({
      path: [
        { x: -2, y: 5 },
        { x: 11, y: 3 },
        { x: 11, y: 3 },
        { x: 4, y: "bad" },
      ],
      spawners: [
        { x: 9, y: 9 },
        { x: -1, y: -1 },
      ],
      towers: [
        { x: 2, y: 2, range: 1, damage: 1, level: 1 },
        { x: 20, y: 20, range: 5, damage: 7, level: 3, type: "single" },
        { x: 2, y: 2, range: 10, damage: 10, level: 10 },
        { x: 1, y: 1, range: "bad" },
      ],
      waves: [
        {
          name: "",
          spawns: [
            { spawner: -1, type: "fast", count: 0 },
            { spawner: 3, type: "tank", count: 2 },
            { spawner: 0, type: "ghost", count: 1 },
          ],
        },
        ["fast", "tank", "unknown"],
      ],
    });

    expect(deserializeLevel(raw)).toEqual({
      path: [
        { x: 0, y: 5 },
        { x: 9, y: 3 },
      ],
      spawners: [
        { x: 9, y: 9 },
        { x: 0, y: 0 },
      ],
      towers: [
        { x: 2, y: 2, range: 1, damage: 1, level: 1 },
        { x: 9, y: 9, range: 5, damage: 7, level: 3, type: "single" },
      ],
      waves: [
        {
          name: "Wave 1",
          spawns: [
            { spawner: 0, type: "fast", count: 1 },
            { spawner: 1, type: "tank", count: 2 },
          ],
        },
        {
          name: "Wave 2",
          spawns: [
            { spawner: 0, type: "fast", count: 1 },
            { spawner: 0, type: "tank", count: 1 },
          ],
        },
      ],
    });
  });
});
