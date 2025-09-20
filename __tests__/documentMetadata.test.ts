import {
  FALLBACK_THEME_COLOR,
  getThemeColor,
  getThemeColorMetaContent,
  setThemeColorMeta,
} from '../utils/metadata';
import { readAccentColorFromStyles } from '../utils/metadata.server';

describe('document metadata utilities', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.documentElement.removeAttribute('style');
  });

  it('creates the theme-color meta tag when missing', () => {
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
    setThemeColorMeta();
    const meta = document.querySelector('meta[name="theme-color"]');
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute('content')).toBe(FALLBACK_THEME_COLOR);
  });

  it('reads the runtime accent color for updates', () => {
    document.documentElement.style.setProperty('--color-accent', '#123456');
    setThemeColorMeta();
    expect(getThemeColorMetaContent()).toBe('#123456');
  });

  it('accepts an explicit color override', () => {
    setThemeColorMeta('#654321');
    expect(getThemeColorMetaContent()).toBe('#654321');
  });

  it('falls back to default when accent variable is missing', () => {
    document.documentElement.style.removeProperty('--color-accent');
    expect(getThemeColor()).toBe(FALLBACK_THEME_COLOR);
  });

  it('reads the accent color from CSS files on the server', () => {
    expect(readAccentColorFromStyles()).toBe('#1793d1');
  });
});
