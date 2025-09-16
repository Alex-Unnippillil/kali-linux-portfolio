import {
  clearWindowGeometry,
  loadWindowGeometry,
  saveWindowGeometry,
} from '../src/wm/persistence';

const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    configurable: true,
    writable: true,
  });
};

describe('window manager persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearWindowGeometry();
    setViewport(originalInnerWidth, originalInnerHeight);
  });

  afterAll(() => {
    setViewport(originalInnerWidth, originalInnerHeight);
  });

  it('returns defaults when no prior geometry exists', () => {
    const geometry = loadWindowGeometry('terminal');
    const expectedX =
      window.innerHeight > window.innerWidth
        ? Math.round(window.innerWidth * 0.05)
        : 60;
    expect(geometry).toEqual({ x: expectedX, y: 10 });
  });

  it('stores and restores geometry per app id', () => {
    saveWindowGeometry('terminal', { x: 120, y: 220 });
    expect(loadWindowGeometry('terminal')).toEqual({ x: 120, y: 220 });

    // other apps should not be affected
    const expectedX =
      window.innerHeight > window.innerWidth
        ? Math.round(window.innerWidth * 0.05)
        : 60;
    expect(loadWindowGeometry('notes')).toEqual({ x: expectedX, y: 10 });
  });

  it('clears stored geometry for an app', () => {
    saveWindowGeometry('terminal', { x: 80, y: 150 });
    clearWindowGeometry('terminal');

    expect(loadWindowGeometry('terminal', { x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  });

  it('computes portrait defaults when taller than wide', () => {
    setViewport(300, 800);

    clearWindowGeometry();
    window.localStorage.clear();

    const geometry = loadWindowGeometry('reader');
    expect(geometry.x).toBe(Math.round(300 * 0.05));
    expect(geometry.y).toBe(10);
  });
});
