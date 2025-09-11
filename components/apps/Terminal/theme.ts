export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

// Color‑vision friendly palette derived from the Okabe–Ito color set
export const accessiblePalette: TerminalTheme = {
  background: '#000000',
  foreground: '#F9F9F9',
  cursor: '#F9F9F9',
  selection: '#FFFFFF40',
  black: '#000000',
  red: '#D55E00',
  green: '#009E73',
  yellow: '#F0E442',
  blue: '#0072B2',
  magenta: '#CC79A7',
  cyan: '#56B4E9',
  white: '#F9F9F9',
  brightBlack: '#595959',
  brightRed: '#FF8C1A',
  brightGreen: '#00D8A0',
  brightYellow: '#FFF76B',
  brightBlue: '#3399FF',
  brightMagenta: '#E39FCB',
  brightCyan: '#80C7F1',
  brightWhite: '#FFFFFF',
};

// High contrast palette for maximum legibility
export const highContrastPalette: TerminalTheme = {
  background: '#000000',
  foreground: '#FFFFFF',
  cursor: '#FFFFFF',
  selection: '#FFFFFF',
  black: '#000000',
  red: '#FF0000',
  green: '#00FF00',
  yellow: '#FFFF00',
  blue: '#0000FF',
  magenta: '#FF00FF',
  cyan: '#00FFFF',
  white: '#FFFFFF',
  brightBlack: '#7F7F7F',
  brightRed: '#FF5555',
  brightGreen: '#55FF55',
  brightYellow: '#FFFF55',
  brightBlue: '#5555FF',
  brightMagenta: '#FF55FF',
  brightCyan: '#55FFFF',
  brightWhite: '#FFFFFF',
};

export const TERMINAL_PALETTE_KEY = 'terminal:palette';

const PALETTES = {
  accessible: accessiblePalette,
  highContrast: highContrastPalette,
};

export type PaletteName = keyof typeof PALETTES;

export const getTerminalPaletteName = (): PaletteName => {
  if (typeof window === 'undefined') return 'accessible';
  try {
    const stored = window.localStorage.getItem(TERMINAL_PALETTE_KEY);
    if (stored && stored in PALETTES) return stored as PaletteName;
  } catch {
    /* ignore */
  }
  return 'accessible';
};

export const getTerminalPalette = (): TerminalTheme =>
  PALETTES[getTerminalPaletteName()];

export const setTerminalPalette = (name: PaletteName): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TERMINAL_PALETTE_KEY, name);
  } catch {
    /* ignore */
  }
};

export { PALETTES };
