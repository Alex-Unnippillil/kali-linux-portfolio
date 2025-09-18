import {
  defaults,
  getTerminalFontScale,
  setTerminalFontScale,
  getTerminalTheme,
  setTerminalTheme,
  getTerminalSize,
  setTerminalSize,
} from '../utils/settingsStore';

const TERMINAL_FONT_KEY = 'terminal-font';
const TERMINAL_THEME_KEY = 'terminal-theme';
const TERMINAL_SIZE_KEY = 'terminal-size';
const NEW_FONT_KEY = 'terminalFontScale';
const NEW_THEME_KEY = 'terminalTheme';
const NEW_SIZE_KEY = 'terminalSize';

describe('terminal settings storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults when nothing stored', async () => {
    await expect(getTerminalFontScale()).resolves.toBe(defaults.terminalFontScale);
    await expect(getTerminalTheme()).resolves.toBe(defaults.terminalTheme);
    await expect(getTerminalSize()).resolves.toEqual(defaults.terminalSize);
  });

  it('migrates legacy keys to the new schema', async () => {
    window.localStorage.setItem(TERMINAL_FONT_KEY, '1.25');
    window.localStorage.setItem(TERMINAL_THEME_KEY, 'matrix');
    window.localStorage.setItem(
      TERMINAL_SIZE_KEY,
      JSON.stringify({ width: 720, height: 480 }),
    );

    expect(await getTerminalFontScale()).toBeCloseTo(1.25);
    expect(window.localStorage.getItem(TERMINAL_FONT_KEY)).toBeNull();
    expect(window.localStorage.getItem(NEW_FONT_KEY)).toBe('1.25');

    expect(await getTerminalTheme()).toBe('matrix');
    expect(window.localStorage.getItem(TERMINAL_THEME_KEY)).toBeNull();
    expect(window.localStorage.getItem(NEW_THEME_KEY)).toBe('matrix');

    expect(await getTerminalSize()).toEqual({ width: 720, height: 480 });
    expect(window.localStorage.getItem(TERMINAL_SIZE_KEY)).toBeNull();
    expect(window.localStorage.getItem(NEW_SIZE_KEY)).toBe(
      JSON.stringify({ width: 720, height: 480 }),
    );
  });

  it('persists new keys without data loss', async () => {
    await setTerminalFontScale(1.5);
    await setTerminalTheme('paper');
    await setTerminalSize({ width: 800, height: 600 });

    expect(await getTerminalFontScale()).toBeCloseTo(1.5);
    expect(await getTerminalTheme()).toBe('paper');
    expect(await getTerminalSize()).toEqual({ width: 800, height: 600 });

    expect(window.localStorage.getItem(NEW_FONT_KEY)).toBe('1.5');
    expect(window.localStorage.getItem(NEW_THEME_KEY)).toBe('paper');
    expect(window.localStorage.getItem(NEW_SIZE_KEY)).toBe(
      JSON.stringify({ width: 800, height: 600 }),
    );
  });
});
