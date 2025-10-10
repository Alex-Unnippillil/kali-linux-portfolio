import { Desktop } from '../components/screen/desktop';
import { DESKTOP_TOP_PADDING } from '../utils/uiConstants';

const DENSITY_KEY = 'desktop-icon-density';

describe('Desktop icon density preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('applies stored density preference when configuring touch targets', () => {
    window.localStorage.setItem(DENSITY_KEY, JSON.stringify('small'));
    const desktop = new Desktop({});
    desktop.realignIconPositions = jest.fn();

    desktop.configureTouchTargets(false);

    expect(desktop.iconDimensions).toEqual({ width: 80, height: 72 });
    expect(desktop.iconGridSpacing).toEqual({ row: 96, column: 112 });
    expect(desktop.desktopPadding).toEqual({
      top: DESKTOP_TOP_PADDING,
      right: 24,
      bottom: 112,
      left: 24,
    });
    expect(desktop.realignIconPositions).toHaveBeenCalledTimes(1);
  });

  it('updates density preference from events and persists selection', () => {
    const desktop = new Desktop({});
    desktop.realignIconPositions = jest.fn();

    desktop.configureTouchTargets(false);
    desktop.handleIconDensityChange({ detail: { density: 'large' } });

    expect(desktop.iconDimensions).toEqual({ width: 120, height: 108 });
    expect(desktop.iconGridSpacing).toEqual({ row: 144, column: 156 });
    expect(desktop.realignIconPositions).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(DENSITY_KEY)).toBe(JSON.stringify('large'));

    const nextDesktop = new Desktop({});
    nextDesktop.realignIconPositions = jest.fn();
    nextDesktop.configureTouchTargets(false);

    expect(nextDesktop.iconDimensions).toEqual({ width: 120, height: 108 });
    expect(nextDesktop.realignIconPositions).toHaveBeenCalledTimes(1);
  });
});
