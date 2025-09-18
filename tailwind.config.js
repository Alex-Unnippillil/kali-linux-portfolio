const plugin = require('tailwindcss/plugin');

const surfaceColors = {
  ground: 'var(--color-surface-ground)',
  panel: 'var(--color-surface-panel)',
  elevated: 'var(--color-surface-elevated)',
  muted: 'var(--color-surface-muted)',
  inverse: 'var(--color-surface-inverse)',
  overlay: 'var(--color-surface-overlay)',
};

const textColors = {
  primary: 'var(--color-text-primary)',
  secondary: 'var(--color-text-secondary)',
  muted: 'var(--color-text-muted)',
  subtle: 'var(--color-text-subtle)',
  inverse: 'var(--color-text-inverse)',
  accent: 'var(--color-text-accent)',
};

const brandColors = {
  primary: 'var(--color-brand-primary)',
  secondary: 'var(--color-brand-secondary)',
  tertiary: 'var(--color-brand-tertiary)',
  highlight: 'var(--color-brand-highlight)',
};

const statusColors = {
  info: 'var(--color-status-info)',
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  danger: 'var(--color-status-danger)',
  critical: 'var(--color-status-critical)',
  neutral: 'var(--color-status-neutral)',
};

const borderColors = {
  subtle: 'var(--color-border-subtle)',
  strong: 'var(--color-border-strong)',
  focus: 'var(--color-border-focus)',
  emphasis: 'var(--color-border-emphasis)',
};

const overlayColors = {
  scrim: 'var(--color-overlay-scrim)',
  highlight: 'var(--color-overlay-highlight)',
};

const legacyColors = {
  'ub-grey': 'var(--color-ub-grey)',
  'ub-warm-grey': 'var(--color-ub-warm-grey)',
  'ub-cool-grey': 'var(--color-ub-cool-grey)',
  'ub-orange': 'var(--color-ub-orange)',
  'ub-lite-abrgn': 'var(--color-ub-lite-abrgn)',
  'ub-med-abrgn': 'var(--color-ub-med-abrgn)',
  'ub-drk-abrgn': 'var(--color-ub-drk-abrgn)',
  'ub-window-title': 'var(--color-ub-window-title)',
  'ub-gedit-dark': 'var(--color-ub-gedit-dark)',
  'ub-gedit-light': 'var(--color-ub-gedit-light)',
  'ub-gedit-darker': 'var(--color-ub-gedit-darker)',
  'ubt-grey': 'var(--color-ubt-grey)',
  'ubt-warm-grey': 'var(--color-ubt-warm-grey)',
  'ubt-cool-grey': 'var(--color-ubt-cool-grey)',
  'ubt-blue': 'var(--color-ubt-blue)',
  'ubt-green': 'var(--color-ubt-green)',
  'ubt-gedit-orange': 'var(--color-ubt-gedit-orange)',
  'ubt-gedit-blue': 'var(--color-ubt-gedit-blue)',
  'ubt-gedit-dark': 'var(--color-ubt-gedit-dark)',
  'ub-border-orange': 'var(--color-ub-border-orange)',
  'ub-dark-grey': 'var(--color-ub-dark-grey)',
};

const spacingScale = {
  '3xs': 'var(--space-3xs)',
  '2xs': 'var(--space-2xs)',
  xs: 'var(--space-xs)',
  sm: 'var(--space-sm)',
  md: 'var(--space-md)',
  lg: 'var(--space-lg)',
  xl: 'var(--space-xl)',
  '2xl': 'var(--space-2xl)',
  '3xl': 'var(--space-3xl)',
  '4xl': 'var(--space-4xl)',
};

const radiusScale = {
  xs: 'var(--radius-xs)',
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  pill: 'var(--radius-pill)',
  full: 'var(--radius-full)',
};

const shadowScale = {
  none: 'var(--shadow-none)',
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  glow: 'var(--shadow-glow)',
  focus: 'var(--shadow-focus)',
  terminal: 'var(--shadow-terminal)',
};

const motionDurations = {
  instant: 'var(--motion-duration-instant)',
  fast: 'var(--motion-duration-fast)',
  medium: 'var(--motion-duration-medium)',
  slow: 'var(--motion-duration-slow)',
  entrance: 'var(--motion-duration-entrance)',
  emphasis: 'var(--motion-duration-emphasis)',
};

const motionDelays = {
  short: 'var(--motion-delay-short)',
  medium: 'var(--motion-delay-medium)',
  long: 'var(--motion-delay-long)',
};

const motionEasing = {
  standard: 'var(--motion-easing-standard)',
  decelerate: 'var(--motion-easing-decelerate)',
  accelerate: 'var(--motion-easing-accelerate)',
  emphasized: 'var(--motion-easing-emphasized)',
};

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
      colors: {
        surface: surfaceColors,
        text: textColors,
        brand: brandColors,
        status: statusColors,
        border: borderColors,
        overlay: overlayColors,
        ...legacyColors,
      },
      fontFamily: {
        ubuntu: ['Ubuntu', 'sans-serif'],
      },
      spacing: spacingScale,
      borderRadius: radiusScale,
      boxShadow: shadowScale,
      transitionDuration: motionDurations,
      transitionDelay: motionDelays,
      transitionTimingFunction: motionEasing,
      minWidth: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'full': '100%',
      },
      minHeight: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'full': '100%',
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
          '0%, 100%': { boxShadow: '0 0 0px theme("colors.amber.400")' },
          '50%': { boxShadow: '0 0 8px theme("colors.amber.400")' },
        },
        flourish: {
          '0%': { transform: 'scale(0.8) rotate(0deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
        },
        mine: {
          '0%': { transform: 'translate(0,0) scale(1)', backgroundColor: 'theme("colors.red.500")' },
          '50%': {
            transform: 'translate(-1px,1px) scale(1.1)',
            backgroundColor: 'theme("colors.red.700")',
          },
          '100%': { transform: 'translate(0,0) scale(1)', backgroundColor: 'theme("colors.red.500")' },
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
    plugin(function ({ addUtilities }) {
      const cols = {};
      for (let i = 1; i <= 12; i++) {
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
