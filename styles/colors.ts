export interface ColorPair {
  name: string;
  foreground: string;
  background: string;
  description: string;
  minimumRatio?: number;
}

export interface SemanticPalette {
  surfaces: {
    appBackground: ColorPair;
    windowChrome: ColorPair;
    elevatedSurface: ColorPair;
  };
  buttons: {
    primary: ColorPair & { hover: string };
  };
  status: {
    success: ColorPair;
    info: ColorPair;
    warning: ColorPair;
    danger: ColorPair;
  };
}

export const semanticPalette: SemanticPalette = {
  surfaces: {
    appBackground: {
      name: 'App background',
      background: '#0f1317',
      foreground: '#f5f5f5',
      description: 'Primary desktop background and body text',
    },
    windowChrome: {
      name: 'Window chrome',
      background: '#0c0f12',
      foreground: '#f5f5f5',
      description: 'Window title bar and controls',
    },
    elevatedSurface: {
      name: 'Elevated surface',
      background: '#1a1f26',
      foreground: '#f8fafc',
      description: 'Floating panels, cards, and popovers',
    },
  },
  buttons: {
    primary: {
      name: 'Primary button',
      background: '#1793d1',
      foreground: '#04111a',
      description: 'Primary action buttons on dark surfaces',
      hover: '#1b8ec5',
    },
  },
  status: {
    success: {
      name: 'Success badge',
      background: '#15803d',
      foreground: '#ffffff',
      description: 'Positive status badges and banners',
    },
    info: {
      name: 'Info badge',
      background: '#1d4ed8',
      foreground: '#ffffff',
      description: 'Informational status badges',
    },
    warning: {
      name: 'Warning badge',
      background: '#d97706',
      foreground: '#111827',
      description: 'Warning badges with dark text',
    },
    danger: {
      name: 'Danger badge',
      background: '#b91c1c',
      foreground: '#ffffff',
      description: 'Error and destructive status badges',
    },
  },
};

export const contrastPairs: ColorPair[] = [
  semanticPalette.surfaces.appBackground,
  semanticPalette.surfaces.windowChrome,
  semanticPalette.surfaces.elevatedSurface,
  semanticPalette.buttons.primary,
  {
    name: 'Primary button (hover)',
    background: semanticPalette.buttons.primary.hover,
    foreground: semanticPalette.buttons.primary.foreground,
    description: 'Primary action button hover state',
  },
  semanticPalette.status.success,
  semanticPalette.status.info,
  semanticPalette.status.warning,
  semanticPalette.status.danger,
].map((pair) => ({
  ...pair,
  minimumRatio: 4.5,
}));

export const colorVariables: Record<string, string> = {
  '--color-bg': semanticPalette.surfaces.appBackground.background,
  '--color-text': semanticPalette.surfaces.appBackground.foreground,
  '--color-surface': semanticPalette.surfaces.elevatedSurface.background,
  '--color-surface-text': semanticPalette.surfaces.elevatedSurface.foreground,
  '--color-window-chrome': semanticPalette.surfaces.windowChrome.background,
  '--color-window-chrome-text': semanticPalette.surfaces.windowChrome.foreground,
  '--color-primary': semanticPalette.buttons.primary.background,
  '--color-primary-hover': semanticPalette.buttons.primary.hover,
  '--color-on-primary': semanticPalette.buttons.primary.foreground,
  '--color-button-primary': semanticPalette.buttons.primary.background,
  '--color-on-button-primary': semanticPalette.buttons.primary.foreground,
  '--color-button-primary-hover': semanticPalette.buttons.primary.hover,
  '--color-status-success': semanticPalette.status.success.background,
  '--color-on-status-success': semanticPalette.status.success.foreground,
  '--color-status-info': semanticPalette.status.info.background,
  '--color-on-status-info': semanticPalette.status.info.foreground,
  '--color-status-warning': semanticPalette.status.warning.background,
  '--color-on-status-warning': semanticPalette.status.warning.foreground,
  '--color-status-danger': semanticPalette.status.danger.background,
  '--color-on-status-danger': semanticPalette.status.danger.foreground,
};

export const contrastRatio = (foreground: string, background: string): number => {
  const hexToRgb = (hex: string) => {
    let normalized = hex.replace('#', '');
    if (normalized.length === 3) {
      normalized = normalized
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const value = parseInt(normalized, 16);
    return [
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff,
    ].map((component) => component / 255);
  };

  const relativeLuminance = ([r, g, b]: number[]): number => {
    const channel = (value: number) =>
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

    const [rLin, gLin, bLin] = [r, g, b].map(channel);
    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  };

  const fgLuminance = relativeLuminance(hexToRgb(foreground));
  const bgLuminance = relativeLuminance(hexToRgb(background));
  const [lighter, darker] = fgLuminance > bgLuminance
    ? [fgLuminance, bgLuminance]
    : [bgLuminance, fgLuminance];

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
};

export const meetsContrastRequirement = (pair: ColorPair): boolean => {
  const ratio = contrastRatio(pair.foreground, pair.background);
  return ratio >= (pair.minimumRatio ?? 4.5);
};
