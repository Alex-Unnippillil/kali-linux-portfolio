import { getTheme, setTheme, getUnlockedThemes } from '../utils/theme';

describe('theme persistence and unlocking', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('theme persists across sessions', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
    // simulate reload by reading from localStorage again
    expect(window.localStorage.getItem('app:theme')).toBe('dark');
  });

  test('themes unlock at score milestones', () => {
    const unlocked = getUnlockedThemes(600);
    expect(unlocked).toEqual(expect.arrayContaining(['default', 'neon', 'dark']));
    expect(unlocked).not.toContain('matrix');
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
