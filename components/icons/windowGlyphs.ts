import { registerIcon } from '../../lib/icon-registry';

export const WINDOW_GLYPH_NAMES = {
  minimize: 'window.minimize',
  maximize: 'window.maximize',
  restore: 'window.restore',
  close: 'window.close',
  pin: 'window.pin',
} as const;

type GlyphKey = keyof typeof WINDOW_GLYPH_NAMES;

type GlyphDefinition = {
  name: (typeof WINDOW_GLYPH_NAMES)[GlyphKey];
  src: string;
  alt: string;
};

const definitions: Record<GlyphKey, GlyphDefinition> = {
  minimize: {
    name: WINDOW_GLYPH_NAMES.minimize,
    src: '/themes/Yaru/window/window-minimize-symbolic.svg',
    alt: 'Minimize window',
  },
  maximize: {
    name: WINDOW_GLYPH_NAMES.maximize,
    src: '/themes/Yaru/window/window-maximize-symbolic.svg',
    alt: 'Maximize window',
  },
  restore: {
    name: WINDOW_GLYPH_NAMES.restore,
    src: '/themes/Yaru/window/window-restore-symbolic.svg',
    alt: 'Restore window',
  },
  close: {
    name: WINDOW_GLYPH_NAMES.close,
    src: '/themes/Yaru/window/window-close-symbolic.svg',
    alt: 'Close window',
  },
  pin: {
    name: WINDOW_GLYPH_NAMES.pin,
    src: '/themes/Yaru/window/window-pin-symbolic.svg',
    alt: 'Pin window',
  },
};

for (const glyph of Object.values(definitions)) {
  registerIcon(glyph.name, { src: glyph.src, alt: glyph.alt });
}

export type WindowGlyph = typeof WINDOW_GLYPH_NAMES[GlyphKey];

export function getWindowGlyphDefinition(key: GlyphKey) {
  return definitions[key];
}
