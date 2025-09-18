import {
  computePathLength,
  computeSmoothedPath,
  getSegmentLengths,
} from "../../../apps/tower-defense/pathing";

describe("tower defense pathing", () => {
  it("returns empty array when no waypoints provided", () => {
    expect(computeSmoothedPath([])).toEqual([]);
  });

  it("returns the cell center for a single waypoint", () => {
    const result = computeSmoothedPath([{ x: 1, y: 2 }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 1.5, y: 2.5 });
  });

  it("creates evenly spaced samples for a straight path", () => {
    const result = computeSmoothedPath(
      [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
      ],
      4,
    );
    expect(result).toHaveLength(5);
    expect(result[0].x).toBeCloseTo(0.5);
    expect(result[result.length - 1].x).toBeCloseTo(3.5);
    result.forEach((point) => {
      expect(point.y).toBeCloseTo(0.5);
    });
    for (let i = 1; i < result.length; i += 1) {
      expect(result[i].x + 1e-6).toBeGreaterThanOrEqual(result[i - 1].x);
    }
  });

  it("smooths corners with curved samples", () => {
    const result = computeSmoothedPath(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      6,
    );
    expect(result[0]).toEqual({ x: 0.5, y: 0.5 });
    const end = result[result.length - 1];
    expect(end.x).toBeCloseTo(2.5);
    expect(end.y).toBeCloseTo(1.5);
    const hasCurvedPoint = result.some((point) => {
      const xFractional = Math.abs(point.x - Math.round(point.x)) > 1e-3;
      const yFractional = Math.abs(point.y - Math.round(point.y)) > 1e-3;
      return xFractional && yFractional;
    });
    expect(hasCurvedPoint).toBe(true);
    const xs = result.map((p) => p.x);
    const ys = result.map((p) => p.y);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0.4);
    expect(Math.max(...xs)).toBeLessThanOrEqual(2.6);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0.4);
    expect(Math.max(...ys)).toBeLessThanOrEqual(1.6);
  });

  it("computes path length from the sampled segments", () => {
    const samples = computeSmoothedPath(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
      5,
    );
    const segments = getSegmentLengths(samples);
    const total = segments.reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(computePathLength(samples));
    segments.forEach((segment) => {
      expect(segment).toBeGreaterThan(0);
    });
  });
});
