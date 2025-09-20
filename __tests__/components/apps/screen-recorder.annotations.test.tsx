import {
  annotationReducer,
  clampRect,
  createInitialAnnotationState,
  isPointWithinRect,
  normalizeRect,
} from '../../../components/apps/screen-recorder/annotations';

describe('annotationReducer', () => {
  it('adds and selects a new annotation', () => {
    const initial = createInitialAnnotationState();
    const rectAnnotation = {
      id: 'rect-1',
      type: 'rect' as const,
      color: '#fff',
      x: 12,
      y: 8,
      width: 40,
      height: 24,
    };
    const next = annotationReducer(initial, {
      type: 'ADD',
      annotation: rectAnnotation,
    });
    expect(next.annotations).toHaveLength(1);
    expect(next.annotations[0]).toEqual(rectAnnotation);
    expect(next.selectedId).toBe('rect-1');
  });

  it('updates annotation geometry', () => {
    const initial = createInitialAnnotationState();
    const rectAnnotation = {
      id: 'rect-1',
      type: 'rect' as const,
      color: '#fff',
      x: 10,
      y: 10,
      width: 30,
      height: 30,
    };
    const withAnnotation = annotationReducer(initial, {
      type: 'ADD',
      annotation: rectAnnotation,
    });
    const updated = annotationReducer(withAnnotation, {
      type: 'UPDATE',
      id: 'rect-1',
      changes: { width: 50, height: 45 } as Partial<typeof rectAnnotation>,
    });
    expect(updated.annotations[0]).toMatchObject({ width: 50, height: 45 });
  });

  it('removes annotations and clears selection', () => {
    const initial = createInitialAnnotationState();
    const rectAnnotation = {
      id: 'rect-1',
      type: 'rect' as const,
      color: '#fff',
      x: 10,
      y: 10,
      width: 30,
      height: 30,
    };
    const withAnnotation = annotationReducer(initial, {
      type: 'ADD',
      annotation: rectAnnotation,
    });
    const selected = annotationReducer(withAnnotation, {
      type: 'SELECT',
      id: 'rect-1',
    });
    const removed = annotationReducer(selected, {
      type: 'REMOVE',
      id: 'rect-1',
    });
    expect(removed.annotations).toHaveLength(0);
    expect(removed.selectedId).toBeNull();
  });

  it('resets to the initial state', () => {
    const initial = createInitialAnnotationState();
    const state = annotationReducer(initial, {
      type: 'ADD',
      annotation: {
        id: 'arrow-1',
        type: 'arrow' as const,
        color: '#fff',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      },
    });
    expect(state.annotations).toHaveLength(1);
    const reset = annotationReducer(state, { type: 'RESET' });
    expect(reset).toEqual(createInitialAnnotationState());
  });
});

describe('annotation geometry helpers', () => {
  it('normalizes negative rectangle dimensions', () => {
    const rect = normalizeRect({ x: 20, y: 30, width: -10, height: -5 });
    expect(rect).toEqual({ x: 10, y: 25, width: 10, height: 5 });
  });

  it('clamps rectangle to canvas bounds', () => {
    const rect = clampRect(
      { x: -5, y: 10, width: 50, height: 60 },
      { width: 100, height: 80 },
    );
    expect(rect).toEqual({ x: 0, y: 10, width: 50, height: 60 });
  });

  it('detects whether a point is inside a rectangle', () => {
    const rect = { x: 10, y: 10, width: 30, height: 30 };
    expect(isPointWithinRect({ x: 25, y: 25 }, rect)).toBe(true);
    expect(isPointWithinRect({ x: 5, y: 25 }, rect)).toBe(false);
  });
});
