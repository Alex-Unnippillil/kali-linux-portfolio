import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import SettingsApp from '../apps/settings/index';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';

jest.mock('../apps/settings/components/BackgroundSlideshow', () => () => <div data-testid="background-slideshow" />);
jest.mock('../apps/settings/components/KeymapOverlay', () => ({ open }: { open: boolean }) =>
  open ? <div data-testid="keymap-overlay" /> : null,
);
jest.mock('../components/Tabs', () => ({ tabs, active, onChange }: any) => (
  <div data-testid="tabs-mock">
    {tabs.map((tab: any) => (
      <button key={tab.id} onClick={() => onChange(tab.id)} aria-pressed={active === tab.id}>
        {tab.label}
      </button>
    ))}
  </div>
));
jest.mock('../components/ToggleSwitch', () => ({ checked, onChange, ariaLabel }: any) => (
  <button data-testid={ariaLabel} onClick={() => onChange(!checked)}>
    {checked ? 'on' : 'off'}
  </button>
));

afterEach(() => {
  cleanup();
});

const baseContext = {
  accent: defaults.accent,
  setAccent: jest.fn(),
  wallpaper: defaults.wallpaper,
  setWallpaper: jest.fn(),
  density: defaults.density,
  setDensity: jest.fn(),
  reducedMotion: defaults.reducedMotion,
  setReducedMotion: jest.fn(),
  fontScale: defaults.fontScale,
  setFontScale: jest.fn(),
  highContrast: defaults.highContrast,
  setHighContrast: jest.fn(),
  largeHitAreas: defaults.largeHitAreas,
  setLargeHitAreas: jest.fn(),
  pongSpin: defaults.pongSpin,
  setPongSpin: jest.fn(),
  allowNetwork: defaults.allowNetwork,
  setAllowNetwork: jest.fn(),
  haptics: defaults.haptics,
  setHaptics: jest.fn(),
  theme: 'default',
  setTheme: jest.fn(),
} as const;

const renderSettings = (overrides = {}) => {
  const value = { ...baseContext, ...overrides };
  return render(
    <SettingsContext.Provider value={value}>
      <SettingsApp />
    </SettingsContext.Provider>,
  );
};

describe('Settings density options', () => {
  it('lists the three density presets', () => {
    renderSettings();
    fireEvent.click(screen.getByText('Accessibility'));
    const select = screen.getByLabelText('Density:') as HTMLSelectElement;
    const options = Array.from(select.options).map((option) => option.textContent);
    expect(options).toMatchInlineSnapshot(`
      [
        "Comfortable",
        "Cozy",
        "Compact",
      ]
    `);
    expect(select.value).toBe('cozy');
  });

  it('calls setDensity when a new preset is chosen', () => {
    const setDensity = jest.fn();
    renderSettings({ setDensity });
    fireEvent.click(screen.getByText('Accessibility'));
    const select = screen.getByLabelText('Density:');
    fireEvent.change(select, { target: { value: 'compact' } });
    expect(setDensity).toHaveBeenCalledWith('compact');
  });
});
