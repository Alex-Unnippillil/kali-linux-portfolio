type TokenDescriptor = {
  variable: string;
  fallback: string;
};

const paletteTokens = {
  neutral950: { variable: '--color-neutral-950', fallback: '#050608' },
  neutral900: { variable: '--color-neutral-900', fallback: '#0f1317' },
  neutral850: { variable: '--color-neutral-850', fallback: '#13171b' },
  neutral800: { variable: '--color-neutral-800', fallback: '#1b1f24' },
  neutral750: { variable: '--color-neutral-750', fallback: '#22262c' },
  neutral700: { variable: '--color-neutral-700', fallback: '#2a2e36' },
  neutral600: { variable: '--color-neutral-600', fallback: '#353b47' },
  neutral500: { variable: '--color-neutral-500', fallback: '#4a5261' },
  neutral200: { variable: '--color-neutral-200', fallback: '#aeb4c2' },
  neutral100: { variable: '--color-neutral-100', fallback: '#f6f6f5' },
  terminal: { variable: '--color-terminal', fallback: '#00ff00' },
} satisfies Record<string, TokenDescriptor>;

const surfaceTokens = {
  ground: { variable: '--color-surface-ground', fallback: '#0f1317' },
  panel: { variable: '--color-surface-panel', fallback: '#13171b' },
  elevated: { variable: '--color-surface-elevated', fallback: '#1b1f24' },
  muted: { variable: '--color-surface-muted', fallback: '#22262c' },
  backdrop: { variable: '--color-surface-backdrop', fallback: 'rgba(6, 10, 14, 0.92)' },
  overlay: { variable: '--color-surface-overlay', fallback: 'rgba(15, 19, 23, 0.85)' },
  inverse: { variable: '--color-surface-inverse', fallback: '#f6f6f5' },
} satisfies Record<string, TokenDescriptor>;

const textTokens = {
  primary: { variable: '--color-text-primary', fallback: '#f5f5f5' },
  secondary: { variable: '--color-text-secondary', fallback: '#d0d3d8' },
  muted: { variable: '--color-text-muted', fallback: '#aea79f' },
  subtle: { variable: '--color-text-subtle', fallback: '#7d7f83' },
  inverse: { variable: '--color-text-inverse', fallback: '#050608' },
  accent: { variable: '--color-text-accent', fallback: '#62a0ea' },
} satisfies Record<string, TokenDescriptor>;

const brandTokens = {
  primary: { variable: '--color-brand-primary', fallback: '#1793d1' },
  secondary: { variable: '--color-brand-secondary', fallback: '#62a0ea' },
  tertiary: { variable: '--color-brand-tertiary', fallback: '#50b6c6' },
  highlight: { variable: '--color-brand-highlight', fallback: '#f39a21' },
} satisfies Record<string, TokenDescriptor>;

const statusTokens = {
  info: { variable: '--color-status-info', fallback: '#1793d1' },
  success: { variable: '--color-status-success', fallback: '#73d216' },
  warning: { variable: '--color-status-warning', fallback: '#d97706' },
  danger: { variable: '--color-status-danger', fallback: '#b91c1c' },
  critical: { variable: '--color-status-critical', fallback: '#991b1b' },
  neutral: { variable: '--color-status-neutral', fallback: '#7d7f83' },
} satisfies Record<string, TokenDescriptor>;

const borderTokens = {
  subtle: { variable: '--color-border-subtle', fallback: '#22262c' },
  strong: { variable: '--color-border-strong', fallback: '#3f4654' },
  focus: { variable: '--color-border-focus', fallback: '#62a0ea' },
  emphasis: { variable: '--color-border-emphasis', fallback: '#1793d1' },
} satisfies Record<string, TokenDescriptor>;

const overlayTokens = {
  scrim: { variable: '--color-overlay-scrim', fallback: 'rgba(15, 19, 23, 0.85)' },
  highlight: { variable: '--color-overlay-highlight', fallback: 'rgba(23, 147, 209, 0.28)' },
} satisfies Record<string, TokenDescriptor>;

const colorTokens = {
  ...paletteTokens,
  ...surfaceTokens,
  ...textTokens,
  ...brandTokens,
  ...statusTokens,
  ...borderTokens,
  ...overlayTokens,
} satisfies Record<string, TokenDescriptor>;

const spacingTokens = {
  '3xs': { variable: '--space-3xs', fallback: '0.125rem' },
  '2xs': { variable: '--space-2xs', fallback: '0.25rem' },
  xs: { variable: '--space-xs', fallback: '0.375rem' },
  sm: { variable: '--space-sm', fallback: '0.5rem' },
  md: { variable: '--space-md', fallback: '0.75rem' },
  lg: { variable: '--space-lg', fallback: '1rem' },
  xl: { variable: '--space-xl', fallback: '1.5rem' },
  '2xl': { variable: '--space-2xl', fallback: '2rem' },
  '3xl': { variable: '--space-3xl', fallback: '3rem' },
  '4xl': { variable: '--space-4xl', fallback: '4rem' },
} satisfies Record<string, TokenDescriptor>;

const radiusTokens = {
  xs: { variable: '--radius-xs', fallback: '2px' },
  sm: { variable: '--radius-sm', fallback: '4px' },
  md: { variable: '--radius-md', fallback: '6px' },
  lg: { variable: '--radius-lg', fallback: '10px' },
  xl: { variable: '--radius-xl', fallback: '16px' },
  '2xl': { variable: '--radius-2xl', fallback: '24px' },
  pill: { variable: '--radius-pill', fallback: '999px' },
  full: { variable: '--radius-full', fallback: '9999px' },
} satisfies Record<string, TokenDescriptor>;

const shadowTokens = {
  none: { variable: '--shadow-none', fallback: 'none' },
  xs: { variable: '--shadow-xs', fallback: '0 1px 2px 0 rgba(0,0,0,0.65)' },
  sm: { variable: '--shadow-sm', fallback: '0 2px 6px -1px rgba(12,16,24,0.55)' },
  md: {
    variable: '--shadow-md',
    fallback: '0 6px 16px -4px rgba(12,16,24,0.55), 0 4px 8px -4px rgba(0,0,0,0.65)',
  },
  lg: {
    variable: '--shadow-lg',
    fallback: '0 16px 32px -8px rgba(12,16,24,0.55), 0 10px 20px -8px rgba(0,0,0,0.65)',
  },
  glow: { variable: '--shadow-glow', fallback: '0 0 0 3px rgba(23,147,209,0.45)' },
  focus: {
    variable: '--shadow-focus',
    fallback: '0 0 0 2px rgba(255,255,255,0.15), 0 0 0 4px #62a0ea',
  },
  terminal: { variable: '--shadow-terminal', fallback: '0 0 10px rgba(0,255,0,0.5)' },
} satisfies Record<string, TokenDescriptor>;

const motionDurationTokens = {
  instant: { variable: '--motion-duration-instant', fallback: '0ms' },
  fast: { variable: '--motion-duration-fast', fallback: '120ms' },
  medium: { variable: '--motion-duration-medium', fallback: '220ms' },
  slow: { variable: '--motion-duration-slow', fallback: '360ms' },
  entrance: { variable: '--motion-duration-entrance', fallback: '420ms' },
  emphasis: { variable: '--motion-duration-emphasis', fallback: '560ms' },
} satisfies Record<string, TokenDescriptor>;

const motionDelayTokens = {
  short: { variable: '--motion-delay-short', fallback: '50ms' },
  medium: { variable: '--motion-delay-medium', fallback: '150ms' },
  long: { variable: '--motion-delay-long', fallback: '300ms' },
} satisfies Record<string, TokenDescriptor>;

const motionEasingTokens = {
  standard: { variable: '--motion-easing-standard', fallback: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  decelerate: { variable: '--motion-easing-decelerate', fallback: 'cubic-bezier(0, 0, 0.2, 1)' },
  accelerate: { variable: '--motion-easing-accelerate', fallback: 'cubic-bezier(0.4, 0, 1, 1)' },
  emphasized: { variable: '--motion-easing-emphasized', fallback: 'cubic-bezier(0.2, 0, 0, 1)' },
} satisfies Record<string, TokenDescriptor>;

const motionDistanceTokens = {
  sm: { variable: '--motion-distance-sm', fallback: '4px' },
  md: { variable: '--motion-distance-md', fallback: '12px' },
  lg: { variable: '--motion-distance-lg', fallback: '24px' },
} satisfies Record<string, TokenDescriptor>;

export const designTokenRegistry = {
  color: colorTokens,
  palette: paletteTokens,
  surface: surfaceTokens,
  text: textTokens,
  brand: brandTokens,
  status: statusTokens,
  border: borderTokens,
  overlay: overlayTokens,
  spacing: spacingTokens,
  radius: radiusTokens,
  shadow: shadowTokens,
  motionDuration: motionDurationTokens,
  motionDelay: motionDelayTokens,
  motionEasing: motionEasingTokens,
  motionDistance: motionDistanceTokens,
} as const;

export type DesignTokenCategory = keyof typeof designTokenRegistry;
export type DesignTokenName<C extends DesignTokenCategory> = keyof (typeof designTokenRegistry)[C];

interface TokenLookupOptions {
  fallback?: string;
}

export const tokenVar = <C extends DesignTokenCategory>(
  category: C,
  token: DesignTokenName<C>,
): string => {
  return `var(${designTokenRegistry[category][token].variable})`;
};

export const getTokenValue = <C extends DesignTokenCategory>(
  category: C,
  token: DesignTokenName<C>,
  options: TokenLookupOptions = {},
): string => {
  const descriptor = designTokenRegistry[category][token];
  const fallback = options.fallback ?? descriptor.fallback;
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(descriptor.variable);
  return value.trim() || fallback;
};

export type DesignTokenReference<C extends DesignTokenCategory> = {
  category: C;
  name: DesignTokenName<C>;
};

export function resolveDesignToken<C extends DesignTokenCategory>(
  reference: DesignTokenReference<C>,
  options?: TokenLookupOptions,
): string {
  return getTokenValue(reference.category, reference.name, options);
}

export function listDesignTokens<C extends DesignTokenCategory>(category: C): Array<DesignTokenName<C>> {
  return Object.keys(designTokenRegistry[category]) as Array<DesignTokenName<C>>;
}

export const cssVar = tokenVar;
