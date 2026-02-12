import { PlacementManager, ScreenLike } from '../src/wm/placement';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

const screen = (
  id: string,
  left: number,
  top: number,
  width: number,
  height: number,
  extras: Partial<ScreenLike> = {},
): ScreenLike => ({
  id,
  left,
  top,
  width,
  height,
  ...extras,
});

describe('PlacementManager', () => {
  test('clamps window coordinates to the active screen bounds', () => {
    const storage = new MemoryStorage();
    const manager = new PlacementManager({ storage });
    manager.setScreens([
      screen('primary', 0, 0, 1920, 1080, { isPrimary: true }),
    ]);

    const placement = manager.updatePlacement('win-1', 'primary', {
      x: 2100,
      y: 1200,
      width: 800,
      height: 600,
    });

    expect(placement.x).toBe(1120);
    expect(placement.y).toBe(480);
    expect(placement.width).toBe(800);
    expect(placement.height).toBe(600);
    expect(placement.usingFallback).toBe(false);
  });

  test('persists preferred screen and falls back when it is unavailable', () => {
    const storage = new MemoryStorage();
    const primary = screen('primary', 0, 0, 1920, 1080, { isPrimary: true });
    const secondary = screen('secondary', 1920, 0, 1920, 1080);

    const firstSession = new PlacementManager({ storage });
    firstSession.setScreens([primary, secondary]);
    firstSession.updatePlacement('win-2', 'secondary', {
      x: 2020,
      y: 160,
      width: 900,
      height: 700,
    });

    const rehydrated = new PlacementManager({ storage });
    rehydrated.setScreens([primary]);
    const fallbackPlacement = rehydrated.getPlacement('win-2');

    expect(fallbackPlacement.preferredScreenId).toBe('secondary');
    expect(fallbackPlacement.screenId).toBe('primary');
    expect(fallbackPlacement.usingFallback).toBe(true);

    rehydrated.setScreens([primary, secondary]);
    const restoredPlacement = rehydrated.getPlacement('win-2');

    expect(restoredPlacement.screenId).toBe('secondary');
    expect(restoredPlacement.preferredScreenId).toBe('secondary');
    expect(restoredPlacement.usingFallback).toBe(false);
    expect(restoredPlacement.x).toBe(2020);
    expect(restoredPlacement.y).toBe(160);
  });

  test('retains preferred monitor when moving on a fallback display', () => {
    const storage = new MemoryStorage();
    const primary = screen('primary', 0, 0, 1920, 1080, { isPrimary: true });
    const secondary = screen('secondary', 1920, 0, 1920, 1080);

    const manager = new PlacementManager({ storage });
    manager.setScreens([primary, secondary]);
    manager.updatePlacement('win-3', 'secondary', {
      x: 2200,
      y: 240,
      width: 700,
      height: 500,
    });

    manager.setScreens([primary]);
    const fallbackMove = manager.updatePlacement('win-3', 'primary', {
      x: -200,
      y: -100,
      width: 700,
      height: 500,
    });

    expect(fallbackMove.screenId).toBe('primary');
    expect(fallbackMove.usingFallback).toBe(true);
    expect(fallbackMove.preferredScreenId).toBe('secondary');
    expect(fallbackMove.x).toBe(0);
    expect(fallbackMove.y).toBe(0);

    manager.setScreens([primary, secondary]);
    const restored = manager.getPlacement('win-3');

    expect(restored.screenId).toBe('secondary');
    expect(restored.usingFallback).toBe(false);
    expect(restored.x).toBe(2200);
    expect(restored.y).toBe(240);
  });
});
