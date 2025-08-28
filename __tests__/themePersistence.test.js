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
});
