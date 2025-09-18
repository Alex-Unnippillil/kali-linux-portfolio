import { useMemo } from 'react';

export interface TokenDefinition {
  name: string;
  label: string;
  fallback: string;
  description?: string;
}

export interface TokenValue {
  name: string;
  label: string;
  cssVar: string;
  value: string;
  description?: string;
  valuePx?: number;
}

const COLOR_TOKENS: TokenDefinition[] = [
  { name: 'color-bg', label: 'Background', fallback: '#0f1317' },
  { name: 'color-text', label: 'Foreground text', fallback: '#F5F5F5' },
  { name: 'color-ub-grey', label: 'Shell grey', fallback: '#0f1317' },
  { name: 'color-ub-warm-grey', label: 'Warm grey', fallback: '#7d7f83' },
  { name: 'color-ub-cool-grey', label: 'Cool grey', fallback: '#1a1f26' },
  { name: 'color-ub-orange', label: 'Accent blue', fallback: '#1793d1' },
  { name: 'color-ub-lite-abrgn', label: 'Window chrome light', fallback: '#22262c' },
  { name: 'color-ub-med-abrgn', label: 'Window chrome', fallback: '#1b1f24' },
  { name: 'color-ub-drk-abrgn', label: 'Window chrome dark', fallback: '#13171b' },
  { name: 'color-ub-window-title', label: 'Window title', fallback: '#0c0f12' },
  { name: 'color-ub-gedit-dark', label: 'Terminal dark', fallback: '#021B33' },
  { name: 'color-ub-gedit-light', label: 'Terminal light', fallback: '#003B70' },
  { name: 'color-ub-gedit-darker', label: 'Terminal darkest', fallback: '#010D1A' },
  { name: 'color-ubt-grey', label: 'Surface grey', fallback: '#F6F6F5' },
  { name: 'color-ubt-warm-grey', label: 'Warm surface', fallback: '#AEA79F' },
  { name: 'color-ubt-cool-grey', label: 'Cool surface', fallback: '#333333' },
  { name: 'color-ubt-blue', label: 'Info blue', fallback: '#62A0EA' },
  { name: 'color-ubt-green', label: 'Success green', fallback: '#73D216' },
  { name: 'color-ubt-gedit-orange', label: 'Warning orange', fallback: '#F39A21' },
  { name: 'color-ubt-gedit-blue', label: 'Secondary blue', fallback: '#50B6C6' },
  { name: 'color-ubt-gedit-dark', label: 'Secondary dark', fallback: '#003B70' },
  { name: 'color-ub-border-orange', label: 'Accent border', fallback: '#1793d1' },
  { name: 'color-ub-dark-grey', label: 'Backdrop dark', fallback: '#2a2e36' },
  { name: 'game-color-secondary', label: 'Game secondary', fallback: '#1d4ed8' },
  { name: 'game-color-success', label: 'Game success', fallback: '#15803d' },
  { name: 'game-color-warning', label: 'Game warning', fallback: '#d97706' },
  { name: 'game-color-danger', label: 'Game danger', fallback: '#b91c1c' },
];

const SPACING_TOKENS: TokenDefinition[] = [
  { name: 'space-1', label: 'Spacing 1', fallback: '0.25rem', description: 'Tight padding and dividers' },
  { name: 'space-2', label: 'Spacing 2', fallback: '0.5rem', description: 'Compact gaps and padding' },
  { name: 'space-3', label: 'Spacing 3', fallback: '0.75rem', description: 'Form controls and inline spacing' },
  { name: 'space-4', label: 'Spacing 4', fallback: '1rem', description: 'Default stack spacing' },
  { name: 'space-5', label: 'Spacing 5', fallback: '1.5rem', description: 'Section padding' },
  { name: 'space-6', label: 'Spacing 6', fallback: '2rem', description: 'Hero and card padding' },
];

const TYPOGRAPHY_TOKENS: TokenDefinition[] = [
  { name: 'font-family-base', label: 'Base family', fallback: "'Ubuntu', sans-serif" },
  { name: 'font-multiplier', label: 'Font multiplier', fallback: '1' },
  { name: 'hit-area', label: 'Hit area', fallback: '32px', description: 'Minimum interactive target size' },
  { name: 'focus-outline-width', label: 'Focus outline width', fallback: '2px' },
  { name: 'focus-outline-color', label: 'Focus outline color', fallback: '#62A0EA' },
];

const RADIUS_TOKENS: TokenDefinition[] = [
  { name: 'radius-sm', label: 'Radius small', fallback: '2px' },
  { name: 'radius-md', label: 'Radius medium', fallback: '4px' },
  { name: 'radius-lg', label: 'Radius large', fallback: '8px' },
  { name: 'radius-round', label: 'Radius round', fallback: '9999px' },
];

const MOTION_TOKENS: TokenDefinition[] = [
  { name: 'motion-fast', label: 'Motion fast', fallback: '150ms' },
  { name: 'motion-medium', label: 'Motion medium', fallback: '300ms' },
  { name: 'motion-slow', label: 'Motion slow', fallback: '500ms' },
];

const getStyles = (): CSSStyleDeclaration | null => {
  if (typeof window === 'undefined') return null;
  return getComputedStyle(document.documentElement);
};

const readTokens = (defs: TokenDefinition[], styles: CSSStyleDeclaration | null): TokenValue[] =>
  defs.map((def) => {
    const cssVar = `--${def.name}`;
    const raw = styles?.getPropertyValue(cssVar).trim();
    const value = raw && raw.length > 0 ? raw : def.fallback;
    const token: TokenValue = {
      name: def.name,
      label: def.label,
      cssVar,
      value,
      description: def.description,
    };
    if (styles) {
      const px = resolvePx(value, styles);
      if (!Number.isNaN(px)) token.valuePx = px;
    }
    return token;
  });

const LENGTH_RE = /(-?\d*\.?\d+)(px|rem|em)?/;

const resolvePx = (value: string, styles: CSSStyleDeclaration): number => {
  const match = value.match(LENGTH_RE);
  if (!match) return Number.NaN;
  const magnitude = parseFloat(match[1]);
  const unit = match[2] ?? '';
  if (!Number.isFinite(magnitude)) return Number.NaN;
  switch (unit) {
    case '':
    case 'px':
      return magnitude;
    case 'rem':
    case 'em': {
      const base = parseFloat(styles.fontSize);
      if (!Number.isFinite(base)) return Number.NaN;
      return magnitude * base;
    }
    default:
      return Number.NaN;
  }
};

export const useTokenSnapshot = () => {
  const styles = getStyles();
  return useMemo(
    () => ({
      colors: readTokens(COLOR_TOKENS, styles),
      spacing: readTokens(SPACING_TOKENS, styles),
      typography: readTokens(TYPOGRAPHY_TOKENS, styles),
      radius: readTokens(RADIUS_TOKENS, styles),
      motion: readTokens(MOTION_TOKENS, styles),
    }),
    // styles is not stable, so we rely on primitives using stringified theme markers
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [styles?.cssText],
  );
};

export const snapshotTokens = () => {
  const styles = getStyles();
  return {
    colors: readTokens(COLOR_TOKENS, styles),
    spacing: readTokens(SPACING_TOKENS, styles),
    typography: readTokens(TYPOGRAPHY_TOKENS, styles),
    radius: readTokens(RADIUS_TOKENS, styles),
    motion: readTokens(MOTION_TOKENS, styles),
  };
};

export const colorTokenDefs = COLOR_TOKENS;
export const spacingTokenDefs = SPACING_TOKENS;
export const typographyTokenDefs = TYPOGRAPHY_TOKENS;
export const radiusTokenDefs = RADIUS_TOKENS;
export const motionTokenDefs = MOTION_TOKENS;
