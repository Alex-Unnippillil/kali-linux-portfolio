import { getTheme, setTheme, getUnlockedThemes } from '../utils/theme';

describe('theme persistence and unlocking', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
  });

  test('theme persists across sessions and updates DOM', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    // simulate reload by reading from localStorage again
    expect(window.localStorage.getItem('app:theme')).toBe('dark');

    setTheme('default');
    expect(document.documentElement.dataset.theme).toBe('default');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('themes unlock at score milestones', () => {
    const unlocked = getUnlockedThemes(600);
    expect(unlocked).toEqual(expect.arrayContaining(['default', 'neon', 'dark']));
    expect(unlocked).not.toContain('matrix');
  });

  test('dark class applied for neon and matrix themes', () => {
    setTheme('neon');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setTheme('matrix');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
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
