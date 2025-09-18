const plugin = require('tailwindcss/plugin');
const tokens = require('./styles/tokens.json');

const toKebabCase = (value = '') =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();

const hexToRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  const normalized = hex.replace('#', '');
  if (![3, 6].includes(normalized.length)) return null;
  const chunkSize = normalized.length === 3 ? 1 : 2;
  const parts = normalized.match(new RegExp(`.{${chunkSize}}`, 'g'));
  if (!parts) return null;
  const values = parts.map((part) => {
    const normalizedPart = part.length === 1 ? part.repeat(2) : part;
    return parseInt(normalizedPart, 16);
  });
  if (values.some((value) => Number.isNaN(value))) return null;
  return values.join(' ');
};

const createColorVariables = (colorMap = {}) =>
  Object.entries(colorMap).reduce((acc, [key, value]) => {
    const kebab = toKebabCase(key);
    const baseVar = `--color-${kebab}`;
    acc[baseVar] = value;
    const rgb = hexToRgb(value);
    if (rgb) {
      acc[`${baseVar}-rgb`] = rgb;
      acc[`${baseVar}-solid`] = `rgb(var(${baseVar}-rgb) / 1)`;
    }
    return acc;
  }, {});

const createPrefixedVariables = (map = {}, prefix) =>
  Object.entries(map).reduce((acc, [key, value]) => {
    const kebab = toKebabCase(key);
    const variable = prefix ? `--${prefix}-${kebab}` : `--${kebab}`;
    acc[variable] = typeof value === 'number' ? String(value) : value;
    return acc;
  }, {});

const createLegacyColorAliases = (aliases = {}) =>
  Object.entries(aliases).reduce((acc, [legacyKey, targetKey]) => {
    const legacy = toKebabCase(legacyKey);
    const target = toKebabCase(targetKey);
    acc[`--color-${legacy}`] = `var(--color-${target}-solid)`;
    acc[`--color-${legacy}-rgb`] = `var(--color-${target}-rgb)`;
    acc[`--color-${legacy}-solid`] = `var(--color-${target}-solid)`;
    return acc;
  }, {});

const buildModeOverrides = (modes = []) =>
  modes.reduce((acc, mode) => {
    const overrides = {};
    if (mode.colors) {
      Object.assign(overrides, createColorVariables(mode.colors));
    }
    if (mode.typography?.families) {
      Object.assign(
        overrides,
        createPrefixedVariables(mode.typography.families, 'font-family'),
      );
    }
    if (mode.typography?.sizes) {
      Object.assign(
        overrides,
        createPrefixedVariables(mode.typography.sizes, 'font-size'),
      );
    }
    if (mode.typography?.lineHeights) {
      Object.assign(
        overrides,
        createPrefixedVariables(mode.typography.lineHeights, 'line-height'),
      );
    }
    if (mode.motion) {
      Object.assign(overrides, createPrefixedVariables(mode.motion, 'motion'));
    }
    if (mode.misc) {
      if (mode.misc.hitArea) {
        overrides['--hit-area'] = mode.misc.hitArea;
      }
    }
    if (Object.keys(overrides).length > 0 && mode.selector) {
      acc[mode.selector] = overrides;
    }
    return acc;
  }, {});

const buildMediaOverrides = (media = []) =>
  media.map((entry) => {
    const overrides = {};
    if (entry.motion) {
      Object.assign(overrides, createPrefixedVariables(entry.motion, 'motion'));
    }
    if (!entry.query || Object.keys(overrides).length === 0) {
      return null;
    }
    return {
      [`@media ${entry.query}`]: {
        ':root': overrides,
      },
    };
  }).filter(Boolean);

const withOpacityValue = (variable) => ({ opacityValue }) => {
  if (opacityValue !== undefined) {
    return `rgb(var(${variable}) / ${opacityValue})`;
  }
  return `rgb(var(${variable}) / 1)`;
};

const colorVariables = createColorVariables(tokens.colors);
const overlayVariables = createPrefixedVariables(tokens.overlays, 'overlay');
const spacingVariables = createPrefixedVariables(tokens.spacing, 'space');
const radiusVariables = createPrefixedVariables(tokens.radii, 'radius');
const shadowVariables = createPrefixedVariables(tokens.shadows, 'shadow');
const typographyFamilyVariables = createPrefixedVariables(
  tokens.typography?.families,
  'font-family',
);
const typographySizeVariables = createPrefixedVariables(
  tokens.typography?.sizes,
  'font-size',
);
const typographyLineHeightVariables = createPrefixedVariables(
  tokens.typography?.lineHeights,
  'line-height',
);
const typographyWeightVariables = createPrefixedVariables(
  tokens.typography?.weights,
  'font-weight',
);
const motionVariables = createPrefixedVariables(tokens.motion, 'motion');

const legacyColorAliases = createLegacyColorAliases(tokens.legacyColorMap);

const focusColorVariable = `--color-${toKebabCase(tokens.focus?.color || 'accentPrimary')}-rgb`;

const generalColorAliases = {
  '--color-bg': 'var(--color-background-solid)',
  '--color-text': 'var(--color-text-primary-solid)',
  '--color-primary': 'var(--color-accent-primary-solid)',
  '--color-secondary': 'var(--color-surface-muted-solid)',
  '--color-accent': 'var(--color-accent-secondary-solid)',
  '--color-muted': 'var(--color-surface-muted-solid)',
  '--color-surface': 'var(--color-surface-solid)',
  '--color-inverse': 'var(--color-text-inverted-solid)',
  '--color-border': 'var(--color-border-subtle-solid)',
  '--color-terminal': 'var(--color-terminal-solid)',
  '--color-dark': 'var(--color-chrome-solid)',
  '--color-focus-ring': `rgb(var(${focusColorVariable}) / 1)`,
  '--color-selection': `rgb(var(${focusColorVariable}) / 0.32)`,
  '--color-control-accent': `rgb(var(${focusColorVariable}) / 1)`,
};

const spacingAliases = {
  '--space-1': 'var(--space-2xs)',
  '--space-2': 'var(--space-xs)',
  '--space-3': 'var(--space-sm)',
  '--space-4': 'var(--space-md)',
  '--space-5': 'var(--space-lg)',
  '--space-6': 'var(--space-xl)',
};

const baseVariables = {
  ...colorVariables,
  ...overlayVariables,
  ...spacingVariables,
  ...radiusVariables,
  ...shadowVariables,
  ...typographyFamilyVariables,
  ...typographySizeVariables,
  ...typographyLineHeightVariables,
  ...typographyWeightVariables,
  ...motionVariables,
  '--focus-outline-width': tokens.focus?.width || '2px',
  '--focus-outline-offset': tokens.focus?.offset || '2px',
  '--focus-outline-color': `rgb(var(${focusColorVariable}) / 1)`,
  '--font-multiplier': '1',
  '--hit-area': tokens.misc?.hitArea || '32px',
  'accent-color': `rgb(var(${focusColorVariable}) / 1)`,
  ...legacyColorAliases,
  ...generalColorAliases,
  ...spacingAliases,
};

const modeOverrides = buildModeOverrides(tokens.modes);
const mediaOverrides = buildMediaOverrides(tokens.media);

const buildTailwindPalette = (colors) =>
  Object.keys(colors || {}).reduce((acc, key) => {
    const kebab = toKebabCase(key);
    acc[`kali-${kebab}`] = withOpacityValue(`--color-${kebab}-rgb`);
    return acc;
  }, {});

const buildLegacyPalette = (aliases) =>
  Object.entries(aliases || {}).reduce((acc, [legacyKey, targetKey]) => {
    const legacy = toKebabCase(legacyKey);
    const target = toKebabCase(targetKey);
    acc[legacy] = withOpacityValue(`--color-${target}-rgb`);
    return acc;
  }, {});

const tailwindColorPalette = {
  ...buildTailwindPalette(tokens.colors),
  ...buildLegacyPalette(tokens.legacyColorMap),
};

const tailwindSpacingScale = Object.entries(tokens.spacing || {}).reduce(
  (acc, [key]) => {
    acc[key] = `var(--space-${key})`;
    return acc;
  },
  {},
);

const tailwindBorderRadius = {
  none: '0',
  sm: 'var(--radius-xs)',
  DEFAULT: 'var(--radius-md)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'calc(var(--radius-xl) + 0.5rem)',
  pill: 'var(--radius-pill)',
  full: '9999px',
};

const tailwindBoxShadows = Object.entries(tokens.shadows || {}).reduce(
  (acc, [key]) => {
    acc[`kali-${toKebabCase(key)}`] = `var(--shadow-${toKebabCase(key)})`;
    return acc;
  },
  {
    focus: 'var(--shadow-focus)',
    popover: 'var(--shadow-popover)',
  },
);

const tailwindFontFamilies = {
  sans: [
    'var(--font-family-sans)',
    'Ubuntu',
    'Inter',
    'Segoe UI',
    'sans-serif',
  ],
  mono: [
    'var(--font-family-mono)',
    'Fira Code',
    'Source Code Pro',
    'SFMono-Regular',
    'monospace',
  ],
  ubuntu: [
    'var(--font-family-sans)',
    'Ubuntu',
    'Inter',
    'Segoe UI',
    'sans-serif',
  ],
};

const tailwindFontSizes = {
  xs: ['var(--font-size-xs)', { lineHeight: 'var(--line-height-tight)' }],
  sm: ['var(--font-size-sm)', { lineHeight: 'var(--line-height-tight)' }],
  base: ['var(--font-size-md)', { lineHeight: 'var(--line-height-normal)' }],
  lg: ['var(--font-size-lg)', { lineHeight: 'var(--line-height-normal)' }],
  xl: ['var(--font-size-xl)', { lineHeight: 'var(--line-height-snug)' }],
  '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-snug)' }],
  '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
  '4xl': ['var(--font-size-display)', { lineHeight: 'var(--line-height-snug)' }],
};

const tailwindLineHeights = Object.entries(tokens.typography?.lineHeights || {}).reduce(
  (acc, [key]) => {
    acc[key] = `var(--line-height-${toKebabCase(key)})`;
    return acc;
  },
  {},
);

module.exports = {
  darkMode: 'class',
  mode: 'jit',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './apps/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
      },
      colors: tailwindColorPalette,
      spacing: tailwindSpacingScale,
      borderRadius: tailwindBorderRadius,
      boxShadow: tailwindBoxShadows,
      fontFamily: tailwindFontFamilies,
      fontSize: tailwindFontSizes,
      lineHeight: tailwindLineHeights,
      minWidth: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        full: '100%',
      },
      minHeight: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        full: '100%',
      },
      zIndex: {
        '-10': '-10',
      },
      width: {
        'app-icon': '64px',
        'app-icon-lg': '96px',
        'tray-icon': '16px',
        'tray-icon-lg': '32px',
      },
      height: {
        'app-icon': '64px',
        'app-icon-lg': '96px',
        'tray-icon': '16px',
        'tray-icon-lg': '32px',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 0px theme("colors.sky.300")' },
          '50%': { boxShadow: '0 0 8px theme("colors.sky.300")' },
        },
        flourish: {
          '0%': { transform: 'scale(0.8) rotate(0deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
        },
        mine: {
          '0%': {
            transform: 'translate(0,0) scale(1)',
            backgroundColor: 'theme("colors.red.500")',
          },
          '50%': {
            transform: 'translate(-1px,1px) scale(1.1)',
            backgroundColor: 'theme("colors.red.700")',
          },
          '100%': {
            transform: 'translate(0,0) scale(1)',
            backgroundColor: 'theme("colors.red.500")',
          },
        },
      },
      animation: {
        glow: 'glow 1s ease-in-out infinite',
        flourish: 'flourish 0.6s ease-out',
        mine: 'mine 0.4s ease-in-out',
      },
    },
  },
  plugins: [
    plugin(({ addBase, addUtilities }) => {
      addBase({
        ':root': baseVariables,
        ...modeOverrides,
      });

      mediaOverrides.forEach((entry) => addBase(entry));

      const cols = {};
      for (let i = 1; i <= 12; i += 1) {
        const width = `${(i / 12) * 100}%`;
        cols[`.col-${i}`] = { flex: `0 0 ${width}`, maxWidth: width };
        if (i < 12) {
          cols[`.offset-${i}`] = { marginLeft: width };
        }
      }
      addUtilities(cols, ['responsive']);
    }),
  ],
};
