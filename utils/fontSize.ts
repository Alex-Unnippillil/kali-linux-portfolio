export const FONT_SIZE_KEY = 'app:font-size';

export const getFontSize = (): number => {
  if (typeof window === 'undefined') return 16;
  try {
    const stored = window.localStorage.getItem(FONT_SIZE_KEY);
    return stored ? parseInt(stored, 10) : 16;
  } catch {
    return 16;
  }
};

export const setFontSize = (size: number): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FONT_SIZE_KEY, String(size));
  } catch {
    /* ignore storage errors */
  }
};
