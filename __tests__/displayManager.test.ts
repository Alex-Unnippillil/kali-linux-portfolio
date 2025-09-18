import {
  clampRectToDisplay,
  findDisplayForRect,
  getDisplayLayout,
  getWorkspaceRect,
  scaleSizeBetweenDisplays,
  setDisplayLayoutOverride,
  type DisplayDefinition,
  type Rect,
} from '../utils/displayManager';

const makeDisplay = (overrides: Partial<DisplayDefinition> = {}): DisplayDefinition => ({
  id: overrides.id ?? 'display-0',
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  width: overrides.width ?? 1920,
  height: overrides.height ?? 1080,
  scale: overrides.scale ?? 1,
});

const makeRect = (overrides: Partial<Rect> = {}): Rect => ({
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  width: overrides.width ?? 200,
  height: overrides.height ?? 150,
});

describe('displayManager geometry helpers', () => {
  afterEach(() => {
    setDisplayLayoutOverride(null);
  });

  it('clamps rects to stay fully inside a display', () => {
    const display = makeDisplay({ id: 'primary', x: 100, y: 50, width: 500, height: 400 });
    const rect = makeRect({ x: 40, y: -10, width: 250, height: 100 });

    const clamped = clampRectToDisplay(rect, display);

    expect(clamped).toEqual({
      x: 100,
      y: 50,
      width: 250,
      height: 100,
    });
  });

  it('prefers displays that contain the rect centre', () => {
    const displays = [
      makeDisplay({ id: 'left', x: 0, width: 500 }),
      makeDisplay({ id: 'right', x: 500, width: 600 }),
    ];
    setDisplayLayoutOverride(displays);

    const rect = makeRect({ x: 620, y: 20, width: 180, height: 180 });
    const target = findDisplayForRect(rect, displays);

    expect(target?.id).toBe('right');
  });

  it('falls back to the display with the largest overlap', () => {
    const displays = [
      makeDisplay({ id: 'left', x: 0, width: 300 }),
      makeDisplay({ id: 'right', x: 500, width: 400 }),
    ];
    setDisplayLayoutOverride(displays);

    const rect = makeRect({ x: 280, width: 100 });
    const target = findDisplayForRect(rect, displays);

    expect(target?.id).toBe('left');
  });

  it('scales window sizes between displays using density ratio bounds', () => {
    const from = makeDisplay({ id: 'hidpi', width: 1440, height: 900, scale: 2 });
    const to = makeDisplay({ id: 'standard', width: 1280, height: 800, scale: 1 });

    const { width, height } = scaleSizeBetweenDisplays(400, 300, from, to);

    expect(width).toBeCloseTo(800, 5);
    expect(height).toBeCloseTo(600, 5);
    expect(width).toBeLessThanOrEqual(to.width);
  });

  it('computes the combined workspace bounding box', () => {
    const displays = [
      makeDisplay({ id: 'left', x: -1920, y: 0, width: 1920, height: 1080 }),
      makeDisplay({ id: 'centre', x: 0, y: 0, width: 1920, height: 1080 }),
      makeDisplay({ id: 'right', x: 1920, y: -200, width: 1600, height: 1200 }),
    ];
    setDisplayLayoutOverride(displays);

    const workspace = getWorkspaceRect(getDisplayLayout());

    expect(workspace).toEqual({ x: -1920, y: -200, width: 5440, height: 1280 });
  });
});
