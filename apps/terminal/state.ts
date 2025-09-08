'use client';

import usePersistentState from '../../hooks/usePersistentState';
import { TERMINAL_THEMES, type TerminalThemeName } from './themes';

const isThemeName = (v: unknown): v is TerminalThemeName =>
  typeof v === 'string' && v in TERMINAL_THEMES;

export function useTerminalTheme() {
  return usePersistentState<TerminalThemeName>(
    'terminal-theme',
    'Kali-Dark',
    isThemeName,
  );
}
