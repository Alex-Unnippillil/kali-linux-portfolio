import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { aboutProfile } from '../data/about/profile';
import useAboutInterface from '../hooks/useAboutInterface';
import { SettingsContext } from '../hooks/useSettings';

type SettingsValue = React.ContextType<typeof SettingsContext>;

const createSettingsValue = (
  overrides: Partial<SettingsValue> = {}
): SettingsValue => ({
  accent: '#1793d1',
  wallpaper: 'wall-2',
  bgImageName: 'wall-2',
  useKaliWallpaper: false,
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
  theme: 'default',
  desktopTheme: {
    id: 'default',
    accent: '#1793d1',
    wallpaperUrl: '/wallpapers/wall-2.webp',
    fallbackWallpaperUrl: '/wallpapers/wall-2.webp',
    wallpaperName: 'wall-2',
    overlay: undefined,
    useKaliWallpaper: false,
  },
  setAccent: vi.fn(),
  setWallpaper: vi.fn(),
  setUseKaliWallpaper: vi.fn(),
  setDensity: vi.fn(),
  setReducedMotion: vi.fn(),
  setFontScale: vi.fn(),
  setHighContrast: vi.fn(),
  setLargeHitAreas: vi.fn(),
  setPongSpin: vi.fn(),
  setAllowNetwork: vi.fn(),
  setHaptics: vi.fn(),
  setTheme: vi.fn(),
  ...overrides,
});

const withSettingsProvider = (value: SettingsValue) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(SettingsContext.Provider, { value }, children);
  };

describe('useAboutInterface', () => {
  const sections = aboutProfile.sections.slice(0, 3);
  const originalMatchMedia = window.matchMedia;

  const createMatchMedia = (matches: boolean): typeof window.matchMedia =>
    ((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMedia(false),
    });
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = createMatchMedia(false);
  });

  it('restores the last visited section from storage and persists updates', () => {
    window.localStorage.setItem('about-test', sections[1].id);
    const { result } = renderHook(() =>
      useAboutInterface({
        sections,
        storageKey: 'about-test',
        defaultSectionId: sections[0].id,
      })
    );

    expect(result.current.activeSectionId).toBe(sections[1].id);

    act(() => {
      result.current.setActiveSectionId(sections[2].id);
    });

    expect(window.localStorage.getItem('about-test')).toBe(sections[2].id);
    expect(result.current.activeSectionId).toBe(sections[2].id);
  });

  it('honors prefers-reduced-motion when settings allow motion', () => {
    window.matchMedia = createMatchMedia(true);
    const { result } = renderHook(() =>
      useAboutInterface({
        sections,
        storageKey: 'about-motion',
        defaultSectionId: sections[0].id,
      })
    );

    expect(result.current.shouldReduceMotion).toBe(true);
  });

  it('prioritizes SettingsContext reduced motion overrides', () => {
    const wrapper = withSettingsProvider(
      createSettingsValue({
        reducedMotion: true,
      })
    );

    const { result } = renderHook(
      () =>
        useAboutInterface({
          sections,
          storageKey: 'about-settings-motion',
          defaultSectionId: sections[0].id,
        }),
      { wrapper }
    );

    expect(result.current.shouldReduceMotion).toBe(true);
  });
});
