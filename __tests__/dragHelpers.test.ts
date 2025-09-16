import { EDGE_RESISTANCE_DISTANCE, EDGE_RESISTANCE_STRENGTH, getResistedPosition } from '@/src/wm/dragHelpers';

describe('getResistedPosition', () => {
  const bounds = { width: 200, height: 200 };

  it('slows movement as the pointer nears the edges', () => {
    const position = getResistedPosition({ x: EDGE_RESISTANCE_DISTANCE - 2, y: EDGE_RESISTANCE_DISTANCE - 2 }, bounds);
    const expected = (EDGE_RESISTANCE_DISTANCE - 2) * EDGE_RESISTANCE_STRENGTH;
    expect(position.x).toBeCloseTo(expected);
    expect(position.y).toBeCloseTo(expected);
  });

  it('skips resistance when the shift key is pressed', () => {
    const original = EDGE_RESISTANCE_DISTANCE - 2;
    const position = getResistedPosition({ x: original, y: original }, bounds, { shiftKey: true } as any);
    expect(position.x).toBeCloseTo(original);
    expect(position.y).toBeCloseTo(original);
  });

  it('supports overriding the resistance distance', () => {
    const position = getResistedPosition({ x: 5, y: 5 }, bounds, undefined, { distance: 0 });
    expect(position.x).toBe(5);
    expect(position.y).toBe(5);
  });
});
