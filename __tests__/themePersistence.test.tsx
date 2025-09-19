import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { ProfilesProvider, ACTIVE_PROFILE_STORAGE_KEY } from '../hooks/useProfiles';
import { getTheme, getUnlockedThemes, setTheme } from '../utils/theme';
import { getProfileScopedKey } from '../utils/profileKeys';
import { __resetProfilesDbForTests } from '../utils/safeIDB';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('theme persistence and unlocking', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('kali-desktop');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
    __resetProfilesDbForTests();
  });

  test('theme persists across sessions', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProfilesProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </ProfilesProvider>
    );
    const { result } = renderHook(() => useSettings(), {
      wrapper,
    });
    await act(async () => {
      await flushPromises();
    });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    await waitFor(() => expect(window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)).not.toBeNull());
    const activeProfileId = window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    const themeKey = getProfileScopedKey(activeProfileId, 'app:theme');
    expect(getTheme(activeProfileId)).toBe('dark');
    expect(window.localStorage.getItem(themeKey)).toBe('dark');
  });

  test('themes unlock at score milestones', () => {
    const unlocked = getUnlockedThemes(600);
    expect(unlocked).toEqual(expect.arrayContaining(['default', 'neon', 'dark']));
    expect(unlocked).not.toContain('matrix');
  });

  test('dark class applied for neon and matrix themes', () => {
    const activeProfileId = window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    setTheme('neon', activeProfileId);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setTheme('matrix', activeProfileId);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('updates CSS variables without reload', () => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root { --color-bg: white; }
      html[data-theme='dark'] { --color-bg: black; }
      html[data-theme='neon'] { --color-bg: red; }
    `;
    document.head.appendChild(style);

    setTheme('default');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('white');

    setTheme('dark');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('black');

    setTheme('neon');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('red');
  });

  test('defaults to system preference when no stored theme', () => {
    // simulate dark mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(getTheme()).toBe('dark');
    // simulate light mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(getTheme()).toBe('default');
  });
});
