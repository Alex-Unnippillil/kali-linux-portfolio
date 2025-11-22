import {
  computeDragPlacement,
  SNAP_ANIMATION_DURATION_MS,
  SNAP_EDGE_TOLERANCE,
  WindowBounds,
} from '@/src/wm/placement';

describe('computeDragPlacement', () => {
  it('snaps to a sibling right edge within tolerance', () => {
    const rect = { x: 100 + (SNAP_EDGE_TOLERANCE - 1), y: 40, width: 120, height: 120 };
    const siblings: WindowBounds[] = [
      { id: 'sibling-1', x: 0, y: 40, width: 100, height: 120 },
    ];

    const result = computeDragPlacement({ rect, siblings });

    expect(result.rect.x).toBe(100);
    expect(result.rect.width).toBe(rect.width);
    expect(result.snap).not.toBeNull();
    expect(result.snap?.targetId).toBe('sibling-1');
    expect(result.snap?.sourceEdge).toBe('left');
    expect(result.snap?.targetEdge).toBe('right');
    expect(result.animation).toEqual({ type: 'snap', durationMs: SNAP_ANIMATION_DURATION_MS });
  });

  it('prefers the closest sibling candidate when multiple snaps are available', () => {
    const rect = { x: 206, y: 40, width: 80, height: 60 };
    const siblings: WindowBounds[] = [
      { id: 'near', x: 120, y: 40, width: 80, height: 60 }, // diff 6
      { id: 'edge', x: 110, y: 40, width: 88, height: 60 }, // diff 8
    ];

    const result = computeDragPlacement({ rect, siblings });

    expect(result.snap?.targetId).toBe('near');
    expect(result.rect.x).toBe(200);
  });

  it('does not snap when outside of the tolerance', () => {
    const rect = { x: 220, y: 40, width: 120, height: 100 };
    const siblings: WindowBounds[] = [
      { id: 'sibling-1', x: 0, y: 40, width: 100, height: 100 },
    ];

    const result = computeDragPlacement({ rect, siblings });

    expect(result.snap).toBeNull();
    expect(result.animation).toBeNull();
    expect(result.rect.x).toBe(rect.x);
  });

  it('only triggers animation when transitioning into a new snap alignment', () => {
    const rect = { x: 105, y: 40, width: 120, height: 120 };
    const siblings: WindowBounds[] = [
      { id: 'sibling-1', x: 0, y: 40, width: 100, height: 120 },
    ];

    const first = computeDragPlacement({ rect, siblings });
    expect(first.animation).not.toBeNull();

    const second = computeDragPlacement({ rect: { ...first.rect }, siblings, prevSnap: first.snap });
    expect(second.snap?.targetId).toBe(first.snap?.targetId);
    expect(second.animation).toBeNull();
  });
});
