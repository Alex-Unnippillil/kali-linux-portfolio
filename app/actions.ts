'use server';

import { cookies } from 'next/headers';

const COOKIE_OPTIONS = {
  path: '/',
  maxAge: 31536000,
  sameSite: 'lax' as const,
};

const THEME_OPTIONS = new Set(['default', 'dark', 'neon', 'matrix']);
const ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_THEME = 'default';
const DEFAULT_ACCENT = '#1793d1';

export async function setThemeCookie(theme: string, accent: string): Promise<void> {
  const store = await cookies();
  const nextTheme = THEME_OPTIONS.has(theme) ? theme : DEFAULT_THEME;
  const nextAccent = ACCENT_PATTERN.test(accent) ? accent : DEFAULT_ACCENT;
  store.set('kali-theme', nextTheme, COOKIE_OPTIONS);
  store.set('kali-accent', nextAccent, COOKIE_OPTIONS);
}
