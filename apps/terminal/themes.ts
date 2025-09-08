import type { ITheme } from '@xterm/xterm';

export const TERMINAL_THEMES: Record<string, ITheme> = {
  'Kali-Dark': {
    background: '#0f1317',
    foreground: '#f5f5f5',
    cursor: '#f5f5f5',
  },
  'Kali-Light': {
    background: '#f5f5f5',
    foreground: '#0f1317',
    cursor: '#0f1317',
  },
  Solarized: {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
  },
  Dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
  },
};

export type TerminalThemeName = keyof typeof TERMINAL_THEMES;
