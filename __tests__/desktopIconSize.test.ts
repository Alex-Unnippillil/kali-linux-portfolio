import { Desktop } from '../components/screen/desktop';
import { ICON_SIZE_EVENT } from '../utils/iconSizeProfiles';

jest.mock('../utils/windowLayout', () => ({
  clampWindowPositionWithinViewport: jest.fn(),
  clampWindowTopPosition: jest.fn(),
  getSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
  measureWindowTopOffset: jest.fn(() => 0),
}));

describe('Desktop icon size preferences', () => {
  let desktop: Desktop;

  beforeEach(() => {
    document.documentElement.style.cssText = '';
    desktop = new Desktop();
  });

  afterEach(() => {
    desktop.teardownIconSizePreferenceWatcher?.();
    jest.restoreAllMocks();
  });

  it('applies css variables for the small profile', () => {
    const realignSpy = jest.spyOn(desktop, 'realignIconPositions').mockImplementation(() => {});

    desktop.configureTouchTargets(false, 'small');

    expect(document.documentElement.style.getPropertyValue('--desktop-icon-width')).toBe('5.5rem');
    expect(document.documentElement.style.getPropertyValue('--desktop-icon-height')).toBe('5rem');
    expect(realignSpy).toHaveBeenCalled();
  });

  it('responds to preference events with coarse profiles', () => {
    const realignSpy = jest.spyOn(desktop, 'realignIconPositions').mockImplementation(() => {});

    desktop.configureTouchTargets(true, 'medium');
    realignSpy.mockClear();

    desktop.setupIconSizePreferenceWatcher();

    window.dispatchEvent(new CustomEvent(ICON_SIZE_EVENT, { detail: { size: 'large' } }));

    expect(document.documentElement.style.getPropertyValue('--desktop-icon-width')).toBe('8.25rem');
    expect(document.documentElement.style.getPropertyValue('--desktop-icon-height')).toBe('7.5rem');
    expect(realignSpy).toHaveBeenCalled();
  });
});
