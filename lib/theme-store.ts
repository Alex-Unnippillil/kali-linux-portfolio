import { useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'app:theme';

let theme = 'default';
const listeners = new Set<() => void>();

export const getTheme = () => theme;

export function setTheme(newTheme: string): void {
  theme = newTheme;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.dataset.theme = newTheme;
    document.documentElement.classList.toggle(
      'dark',
      ['dark', 'neon', 'matrix', 'kali-dark', 'purple'].includes(newTheme)
    );
  }
  listeners.forEach((fn) => fn());
}

export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useTheme = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setTheme(stored);
    }
  }, []);
  return useSyncExternalStore(subscribe, getTheme);
};
