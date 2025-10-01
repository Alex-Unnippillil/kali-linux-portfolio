import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';
import ModuleCard from '../components/ModuleCard';
import ApplicationsMenu, { KALI_CATEGORIES } from '../components/menu/ApplicationsMenu';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';
import type { ModuleMetadata } from '../modules/metadata';

jest.mock('next/image', () => {
  const MockedImage = (props: any) => <img {...props} alt={props.alt || ''} />;
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

const createSettingsValue = (overrides: Partial<React.ContextType<typeof SettingsContext>> = {}) => ({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
  density: defaults.density,
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  direction: 'rtl' as const,
  setAccent: () => {},
  setWallpaper: () => {},
  setUseKaliWallpaper: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
  setFontScale: () => {},
  setHighContrast: () => {},
  setLargeHitAreas: () => {},
  setPongSpin: () => {},
  setAllowNetwork: () => {},
  setHaptics: () => {},
  setTheme: () => {},
  setDirection: () => {},
  ...overrides,
});

const renderWithSettings = (ui: React.ReactElement) =>
  render(<SettingsContext.Provider value={createSettingsValue()}>{ui}</SettingsContext.Provider>);

beforeEach(() => {
  document.documentElement.setAttribute('dir', 'rtl');
});

describe('RTL smoke coverage', () => {
  it('mirrors WhiskerMenu layout when dir=rtl', () => {
    renderWithSettings(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    const panel = screen.getByTestId('whisker-menu-panel');
    expect(panel.className).toContain('right-1/2');
    expect(panel.className).toContain('translate-x-1/2');
  });

  it('keeps ModuleCard content aligned to the logical start edge', () => {
    const module: ModuleMetadata = {
      name: 'demo_module',
      description: 'Example module description',
      tags: ['demo'],
      options: [],
    };
    renderWithSettings(
      <ModuleCard module={module} onSelect={jest.fn()} selected={false} query="" />,
    );
    const button = screen.getByRole('button', { name: /demo_module/i });
    expect(button).toHaveStyle({ textAlign: 'start' });
  });

  it('renders ApplicationsMenu items with start alignment', () => {
    renderWithSettings(
      <ApplicationsMenu activeCategory={KALI_CATEGORIES[0].id} onSelect={jest.fn()} />,
    );
    const firstButton = screen.getByRole('button', {
      name: new RegExp(KALI_CATEGORIES[0].label, 'i'),
    });
    expect(firstButton).toHaveStyle({ textAlign: 'start' });
  });
});
