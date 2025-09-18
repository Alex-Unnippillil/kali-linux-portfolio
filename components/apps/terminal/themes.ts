import type { ITheme } from '@xterm/xterm';

export interface TerminalThemeOption {
  id: string;
  label: string;
  description?: string;
  theme: ITheme;
  preview?: {
    background?: string;
    foreground?: string;
    accent?: string;
  };
}

export const TERMINAL_THEMES: TerminalThemeOption[] = [
  {
    id: 'kali-night',
    label: 'Kali Night',
    description: 'High-contrast dark theme inspired by the Kali terminal.',
    theme: {
      background: '#0f1317',
      foreground: '#f5f5f5',
      cursor: '#1793d1',
      cursorAccent: '#0f1317',
      selection: '#1793d155',
      black: '#1c1c1c',
      red: '#ff5370',
      green: '#c3e88d',
      yellow: '#ffcb6b',
      blue: '#82aaff',
      magenta: '#c792ea',
      cyan: '#89ddff',
      white: '#d0d0d0',
      brightBlack: '#4e5565',
      brightRed: '#ff869a',
      brightGreen: '#ddffa7',
      brightYellow: '#ffe585',
      brightBlue: '#9cc4ff',
      brightMagenta: '#e7c4ff',
      brightCyan: '#b6f5ff',
      brightWhite: '#ffffff',
    },
    preview: {
      background: '#0f1317',
      foreground: '#f5f5f5',
      accent: '#1793d1',
    },
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'Popular purple and pink palette for long hacking sessions.',
    theme: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#ff79c6',
      cursorAccent: '#282a36',
      selection: '#44475a',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    },
    preview: {
      background: '#282a36',
      foreground: '#f8f8f2',
      accent: '#ff79c6',
    },
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    description: 'Balanced contrast with the classic Solarized palette.',
    theme: {
      background: '#002b36',
      foreground: '#93a1a1',
      cursor: '#839496',
      cursorAccent: '#002b36',
      selection: '#073642',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#586e75',
      brightRed: '#cb4b16',
      brightGreen: '#859900',
      brightYellow: '#b58900',
      brightBlue: '#268bd2',
      brightMagenta: '#6c71c4',
      brightCyan: '#2aa198',
      brightWhite: '#fdf6e3',
    },
    preview: {
      background: '#002b36',
      foreground: '#93a1a1',
      accent: '#268bd2',
    },
  },
  {
    id: 'matrix',
    label: 'Matrix Green',
    description: 'Retro phosphor look with neon green glyphs.',
    theme: {
      background: '#000000',
      foreground: '#00ff9c',
      cursor: '#00ff00',
      cursorAccent: '#000000',
      selection: '#003b00',
      black: '#000000',
      red: '#ff003c',
      green: '#00ff00',
      yellow: '#b7ff00',
      blue: '#00aaff',
      magenta: '#ff00ff',
      cyan: '#00fff0',
      white: '#d0ffd0',
      brightBlack: '#007f00',
      brightRed: '#ff3366',
      brightGreen: '#66ff66',
      brightYellow: '#ccff66',
      brightBlue: '#33ccff',
      brightMagenta: '#ff66ff',
      brightCyan: '#66fff2',
      brightWhite: '#ffffff',
    },
    preview: {
      background: '#000000',
      foreground: '#00ff9c',
      accent: '#00ff00',
    },
  },
];

export const DEFAULT_TERMINAL_THEME_ID = TERMINAL_THEMES[0].id;

export const getTerminalTheme = (id: string): TerminalThemeOption => {
  return TERMINAL_THEMES.find((theme) => theme.id === id) ?? TERMINAL_THEMES[0];
};
