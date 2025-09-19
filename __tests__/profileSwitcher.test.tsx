jest.mock('idb-keyval');

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { ProfileProvider, useProfileSwitcher } from '../hooks/useProfileSwitcher';
import useSession from '../hooks/useSession';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';

const idbKeyval = require('idb-keyval');

const ProfileWrapper = ({ children }: { children: ReactNode }) => (
  <ProfileProvider>{children}</ProfileProvider>
);

const SettingsWrapper = ({ children }: { children: ReactNode }) => (
  <ProfileProvider>
    <SettingsProvider>{children}</SettingsProvider>
  </ProfileProvider>
);

describe('profile switcher and guest mode', () => {
  let uuidCounter = 0;

  beforeEach(() => {
    uuidCounter = 0;
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: jest.fn(() => `uuid-${++uuidCounter}`),
      },
      configurable: true,
    });
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    idbKeyval.__reset();
    idbKeyval.get.mockClear();
    idbKeyval.set.mockClear();
    idbKeyval.del.mockClear();
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      onchange: null,
      dispatchEvent: jest.fn(),
    });
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  test('persistent state scoped per profile and ignored for guests', () => {
    const { result } = renderHook(
      () => {
        const [value, setValue] = usePersistentState('demo-key', 'initial');
        const profile = useProfileSwitcher();
        return { value, setValue, profile };
      },
      { wrapper: ProfileWrapper },
    );

    act(() => {
      result.current.setValue('primary');
    });
    expect(result.current.value).toBe('primary');
    expect(window.localStorage.getItem('profile:default:demo-key')).toBe('"primary"');

    let workProfileId: string;
    act(() => {
      const profile = result.current.profile.createProfile('Work');
      workProfileId = profile.id;
    });

    act(() => {
      result.current.profile.switchProfile(workProfileId);
    });
    expect(result.current.value).toBe('initial');

    act(() => {
      result.current.setValue('work');
    });
    expect(window.localStorage.getItem(`profile:${workProfileId}:demo-key`)).toBe('"work"');

    act(() => {
      result.current.profile.switchProfile('default');
    });
    expect(result.current.value).toBe('primary');

    act(() => {
      result.current.profile.enterGuestMode();
    });
    const guestProfileId = result.current.profile.activeProfileId;

    act(() => {
      result.current.setValue('guest-temp');
    });
    expect(window.localStorage.getItem(`profile:${guestProfileId}:demo-key`)).toBeNull();

    act(() => {
      result.current.profile.exitGuestMode();
    });
    expect(result.current.value).toBe('primary');
    expect(result.current.profile.isGuest).toBe(false);
  });

  test('session resets to defaults after exiting guest mode', async () => {
    const { result } = renderHook(
      () => {
        const session = useSession();
        const profile = useProfileSwitcher();
        return { ...session, profile };
      },
      { wrapper: ProfileWrapper },
    );

    act(() => {
      result.current.setSession({
        windows: [{ id: 'win-1', x: 10, y: 20 }],
        wallpaper: 'wall-5',
        dock: ['terminal'],
      });
    });

    await waitFor(() => {
      const stored = window.localStorage.getItem('profile:default:desktop-session');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.wallpaper).toBe('wall-5');
      expect(parsed.windows).toHaveLength(1);
    });

    act(() => {
      result.current.profile.enterGuestMode();
    });
    const guestProfileId = result.current.profile.activeProfileId;

    act(() => {
      result.current.setSession({
        windows: [{ id: 'win-guest', x: 0, y: 0 }],
        wallpaper: 'wall-1',
        dock: [],
      });
    });

    expect(window.localStorage.getItem(`profile:${guestProfileId}:desktop-session`)).toBeNull();

    act(() => {
      result.current.profile.exitGuestMode();
    });

    await waitFor(() => {
      expect(result.current.session.wallpaper).toBe(defaults.wallpaper);
      const stored = window.localStorage.getItem('profile:default:desktop-session');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.wallpaper).toBe(defaults.wallpaper);
      expect(parsed.windows).toHaveLength(0);
    });
  });

  test('settings are cleared and restored to defaults after guest sessions', async () => {
    const { result } = renderHook(
      () => {
        const settings = useSettings();
        const profile = useProfileSwitcher();
        return { settings, profile };
      },
      { wrapper: SettingsWrapper },
    );

    await act(async () => {
      result.current.settings.setAccent('#e53e3e');
      result.current.settings.setTheme('dark');
      result.current.settings.setReducedMotion(true);
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('app:theme:default')).toBe('dark');
      expect(idbKeyval.set).toHaveBeenCalledWith('default:accent', '#e53e3e');
    });

    act(() => {
      result.current.profile.enterGuestMode();
    });

    await waitFor(() => {
      expect(result.current.settings.theme).toBe('default');
      expect(result.current.settings.accent).toBe(defaults.accent);
    });

    const guestProfileId = result.current.profile.activeProfileId;

    await act(async () => {
      result.current.settings.setTheme('neon');
      result.current.settings.setAccent('#ed64a6');
    });

    expect(window.localStorage.getItem(`app:theme:${guestProfileId}`)).toBeNull();
    const accentCalls = idbKeyval.set.mock.calls.filter(
      (call: [string, ...unknown[]]) => (call[0] as string).endsWith(':accent'),
    );
    expect(accentCalls.some((call) => call[0] === `${guestProfileId}:accent`)).toBe(false);

    act(() => {
      result.current.profile.exitGuestMode();
    });

    await waitFor(() => {
      expect(result.current.settings.theme).toBe('default');
      expect(result.current.settings.accent).toBe(defaults.accent);
      const storedTheme = window.localStorage.getItem('app:theme:default');
      expect(storedTheme).toBe('default');
      expect(idbKeyval.del).toHaveBeenCalledWith('default:accent');
      expect(idbKeyval.set).toHaveBeenCalledWith('default:accent', defaults.accent);
    });
  });
});
