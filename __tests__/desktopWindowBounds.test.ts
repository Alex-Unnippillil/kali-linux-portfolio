import { Desktop } from '../components/screen/desktop';

describe('Desktop.validateWindowBounds', () => {
  let desktop: Desktop;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
      writable: true,
    });
    desktop = new Desktop();
  });

  it('returns a centered fallback rectangle for invalid input', () => {
    const rect = desktop.validateWindowBounds(null);
    expect(rect).toEqual({ x: 180, y: 120, width: 840, height: 560 });
  });

  it('parses numeric strings within viewport bounds', () => {
    const rect = desktop.validateWindowBounds({
      x: '100',
      y: '200',
      width: '300',
      height: '250',
    });
    expect(rect).toEqual({ x: 100, y: 200, width: 300, height: 250 });
  });

  it('falls back when values exceed the viewport', () => {
    const rect = desktop.validateWindowBounds({
      x: 5000,
      y: 4000,
      width: 3000,
      height: 2000,
    });
    expect(rect).toEqual({ x: 180, y: 120, width: 840, height: 560 });
  });
});
