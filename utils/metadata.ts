export const THEME_COLOR_META_NAME = 'theme-color';
export const ACCENT_COLOR_VARIABLE = '--color-accent';
export const FALLBACK_THEME_COLOR = '#1793d1';

const sanitizeColor = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readRuntimeCssVariable = (variable: string): string | null => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  try {
    const computed = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(variable);
    return sanitizeColor(computed);
  } catch {
    return null;
  }
};

const ensureMetaElement = (name: string): HTMLMetaElement | null => {
  if (typeof document === 'undefined') return null;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return null;

  const selector = `meta[name="${name}"]`;
  const existing = head.querySelector<HTMLMetaElement>(selector);
  if (existing) return existing;

  const meta = document.createElement('meta');
  meta.setAttribute('name', name);
  head.appendChild(meta);
  return meta;
};

export const getThemeColor = (): string =>
  readRuntimeCssVariable(ACCENT_COLOR_VARIABLE) ?? FALLBACK_THEME_COLOR;

export const setThemeColorMeta = (color?: string | null): void => {
  const meta = ensureMetaElement(THEME_COLOR_META_NAME);
  if (!meta) return;
  const resolved = sanitizeColor(color) ?? getThemeColor();
  meta.setAttribute('content', resolved);
};

export const getThemeColorMetaContent = (): string | null => {
  if (typeof document === 'undefined') return null;
  const meta = document.querySelector<HTMLMetaElement>(
    `meta[name="${THEME_COLOR_META_NAME}"]`,
  );
  return meta?.getAttribute('content') ?? null;
};

export const metadata = {
  THEME_COLOR_META_NAME,
  ACCENT_COLOR_VARIABLE,
  FALLBACK_THEME_COLOR,
  getThemeColor,
  setThemeColorMeta,
  getThemeColorMetaContent,
};

export default metadata;
