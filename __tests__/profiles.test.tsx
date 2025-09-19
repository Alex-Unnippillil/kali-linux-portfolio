import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  ProfilesProvider,
  useProfiles,
  ACTIVE_PROFILE_STORAGE_KEY,
} from '../hooks/useProfiles';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import useSession from '../hooks/useSession';
import { __resetProfilesDbForTests } from '../utils/safeIDB';
import { getAccent } from '../utils/settingsStore';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('profile management', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('kali-desktop');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
    __resetProfilesDbForTests();
  });

  const ProfilesWrapper = ({ children }: { children: React.ReactNode }) => (
    <ProfilesProvider>{children}</ProfilesProvider>
  );

  const AppWrapper = ({ children }: { children: React.ReactNode }) => (
    <ProfilesProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </ProfilesProvider>
  );

  test('creates profiles and persists metadata', async () => {
    const { result } = renderHook(() => useProfiles(), { wrapper: ProfilesWrapper });
    await act(async () => {
      await flushPromises();
    });
    await waitFor(() => {
      if (!result.current) throw new Error('Profiles not ready');
      expect(result.current.ready).toBe(true);
    });
    const initial = result.current.profiles.length;
    await act(async () => {
      await result.current.createProfile('Tester');
    });
    expect(result.current.profiles.length).toBe(initial + 1);
    expect(result.current.profiles.some((profile) => profile.name === 'Tester')).toBe(true);
  });

  test('switching profiles updates active id and storage', async () => {
    const { result } = renderHook(() => useProfiles(), { wrapper: ProfilesWrapper });
    await act(async () => {
      await flushPromises();
    });
    await waitFor(() => {
      if (!result.current) throw new Error('Profiles not ready');
      expect(result.current.ready).toBe(true);
    });
    const initialSetter = result.current.setActiveProfile;
    const firstProfile = result.current.activeProfileId;
    expect(firstProfile).not.toBeNull();
    await act(async () => {
      await result.current.createProfile('Second');
    });
    const secondProfile = result.current.activeProfileId;
    expect(secondProfile).not.toBe(firstProfile);
    await act(async () => {
      await result.current.setActiveProfile(firstProfile!);
    });
    await waitFor(() => expect(result.current.activeProfileId).toBe(firstProfile));
    expect(window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)).toBe(firstProfile);
  });

  test('switching profiles reloads session and settings quickly', async () => {
    const { result } = renderHook(
      () => ({
        profiles: useProfiles(),
        session: useSession(),
        settings: useSettings(),
      }),
      { wrapper: AppWrapper },
    );

    await act(async () => {
      await flushPromises();
    });
    await waitFor(() => {
      if (!result.current || !result.current.profiles) throw new Error('Profiles not ready');
      expect(result.current.profiles.ready).toBe(true);
    });
    await waitFor(() => expect(result.current!.settings.hydrated).toBe(true));
    const firstProfile = result.current.profiles.activeProfileId!;

    act(() => {
      result.current.session.setSession({
        windows: [{ id: 'alpha', x: 10, y: 20 }],
        wallpaper: 'wall-2',
        dock: ['terminal'],
      });
      result.current.settings.setWallpaper('wall-2');
      result.current.settings.setAccent('#1793d1');
    });

    await act(async () => {
      await result.current.profiles.createProfile('Analyst');
    });
    await waitFor(() => expect(result.current.settings.hydrated).toBe(false));
    await waitFor(() => expect(result.current.settings.hydrated).toBe(true));
    expect(result.current.profiles.profiles.length).toBe(2);
    const secondProfile = result.current.profiles.activeProfileId!;

    act(() => {
      result.current.session.setSession({
        windows: [{ id: 'beta', x: 5, y: 15 }],
        wallpaper: 'wall-5',
        dock: ['browser'],
      });
      result.current.settings.setWallpaper('wall-5');
      result.current.settings.setAccent('#ed64a6');
    });
    expect(result.current.settings.accent).toBe('#ed64a6');
    await waitFor(async () => {
      expect(await getAccent(secondProfile)).toBe('#ed64a6');
    });

    const startFirst = Date.now();
    await act(async () => {
      await result.current.profiles.setActiveProfile(firstProfile);
    });
    await waitFor(
      () =>
        result.current.settings.hydrated &&
        result.current.session.session.windows[0]?.id === 'alpha' &&
        result.current.settings.wallpaper === 'wall-2' &&
        result.current.settings.accent === '#1793d1',
      { timeout: 1500 },
    );
    const firstDuration = Date.now() - startFirst;
    expect(firstDuration).toBeLessThanOrEqual(1500);
    expect(result.current.settings.accent).toBe('#1793d1');

    const startSecond = Date.now();
    await act(async () => {
      await result.current.profiles.setActiveProfile(secondProfile);
    });
    await waitFor(
      () =>
        result.current.settings.hydrated &&
        result.current.session.session.windows[0]?.id === 'beta' &&
        result.current.settings.wallpaper === 'wall-5' &&
        result.current.settings.accent === '#ed64a6',
      { timeout: 1500 },
    );
    const secondDuration = Date.now() - startSecond;
    expect(secondDuration).toBeLessThanOrEqual(1500);
    await waitFor(() => expect(result.current.settings.accent).toBe('#ed64a6'));
  });
});
