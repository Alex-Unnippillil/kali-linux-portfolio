export const THEME_KEY = 'app:theme';
// Score required to unlock each theme
export const THEME_UNLOCKS = {
    default: 0,
    neon: 100,
    dark: 500,
    matrix: 1000,
};
export const getTheme = () => {
    if (typeof window === 'undefined')
        return 'default';
    try {
        return window.localStorage.getItem(THEME_KEY) || 'default';
    }
    catch {
        return 'default';
    }
};
export const setTheme = (theme) => {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(THEME_KEY, theme);
    }
    catch {
        /* ignore storage errors */
    }
};
export const getUnlockedThemes = (highScore) => Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);
export const isThemeUnlocked = (theme, highScore) => highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
