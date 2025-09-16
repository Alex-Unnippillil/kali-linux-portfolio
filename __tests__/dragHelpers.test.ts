import { applyDragResistance, EDGE_RESISTANCE_THRESHOLD } from '../src/wm/dragHelpers';

describe('drag resistance helpers', () => {
  const bounds = { minX: 0, maxX: 400, minY: 0, maxY: 300 };

  it('slows movement as the window nears the left edge', () => {
    const halfThreshold = EDGE_RESISTANCE_THRESHOLD / 2;
    const result = applyDragResistance({ x: halfThreshold, y: 100 }, bounds);

    expect(result.x).toBeLessThan(halfThreshold);
    expect(result.x).toBeGreaterThanOrEqual(0);
  });

  it('bypasses resistance when movement is forced', () => {
    const halfThreshold = EDGE_RESISTANCE_THRESHOLD / 2;
    const result = applyDragResistance(
      { x: halfThreshold, y: 100 },
      bounds,
      { bypass: true }
    );

    expect(result.x).toBe(halfThreshold);
  });

  it('remains consistent across a range of screen densities', () => {
    const position = { x: EDGE_RESISTANCE_THRESHOLD * 0.75, y: 100 };
    const standard = applyDragResistance({ ...position }, bounds, { devicePixelRatio: 1 });
    const highDensity = applyDragResistance({ ...position }, bounds, { devicePixelRatio: 3 });

    expect(Math.abs(standard.x - highDensity.x)).toBeLessThan(1);
  });
});
