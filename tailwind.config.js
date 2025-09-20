const plugin = require('tailwindcss/plugin');

const kaliPalette = {
  'kali-blue': {
    DEFAULT: 'var(--kali-primary-500)',
    50: 'var(--kali-primary-50)',
    100: 'var(--kali-primary-100)',
    200: 'var(--kali-primary-200)',
    300: 'var(--kali-primary-300)',
    400: 'var(--kali-primary-400)',
    500: 'var(--kali-primary-500)',
    600: 'var(--kali-primary-600)',
    700: 'var(--kali-primary-700)',
    800: 'var(--kali-primary-800)',
    900: 'var(--kali-primary-900)',
    950: 'var(--kali-primary-950)',
  },
  'kali-purple': {
    DEFAULT: 'var(--kali-secondary-500)',
    50: 'var(--kali-secondary-50)',
    100: 'var(--kali-secondary-100)',
    200: 'var(--kali-secondary-200)',
    300: 'var(--kali-secondary-300)',
    400: 'var(--kali-secondary-400)',
    500: 'var(--kali-secondary-500)',
    600: 'var(--kali-secondary-600)',
    700: 'var(--kali-secondary-700)',
    800: 'var(--kali-secondary-800)',
    900: 'var(--kali-secondary-900)',
    950: 'var(--kali-secondary-950)',
  },
  'kali-slate': {
    DEFAULT: 'var(--kali-neutral-500)',
    50: 'var(--kali-neutral-50)',
    100: 'var(--kali-neutral-100)',
    200: 'var(--kali-neutral-200)',
    300: 'var(--kali-neutral-300)',
    400: 'var(--kali-neutral-400)',
    500: 'var(--kali-neutral-500)',
    600: 'var(--kali-neutral-600)',
    700: 'var(--kali-neutral-700)',
    800: 'var(--kali-neutral-800)',
    900: 'var(--kali-neutral-900)',
    950: 'var(--kali-neutral-950)',
  },
  surface: 'var(--color-surface)',
  'surface-muted': 'var(--color-muted)',
  'surface-strong': 'var(--color-bg)',
  'surface-overlay': 'var(--kali-bg)',
  border: 'var(--color-border)',
  accent: 'var(--color-accent)',
  'accent-border': 'var(--color-accent-border)',
  'accent-strong': 'var(--kali-primary-600)',
  ink: 'var(--color-text)',
  'ink-muted': 'var(--kali-neutral-200)',
  'ink-inverse': 'var(--color-inverse)',
  terminal: 'var(--color-terminal)',
  'kali-success': 'var(--kali-success-500)',
  'kali-warning': 'var(--kali-warning-500)',
  'kali-danger': 'var(--kali-danger-500)',
};

const legacyPalette = {
  'ub-grey': 'var(--color-surface)',
  'ub-warm-grey': 'var(--kali-neutral-700)',
  'ub-cool-grey': 'var(--color-muted)',
  'ub-orange': 'var(--color-accent)',
  'ub-lite-abrgn': 'var(--kali-neutral-700)',
  'ub-med-abrgn': 'var(--kali-neutral-800)',
  'ub-drk-abrgn': 'var(--kali-neutral-900)',
  'ub-window-title': 'var(--color-bg)',
  'ub-gedit-dark': 'var(--kali-primary-900)',
  'ub-gedit-light': 'var(--kali-primary-700)',
  'ub-gedit-darker': 'var(--kali-primary-950)',
  'ubt-grey': 'var(--kali-neutral-50)',
  'ubt-warm-grey': 'var(--kali-neutral-200)',
  'ubt-cool-grey': 'var(--kali-neutral-600)',
  'ubt-blue': 'var(--kali-primary-300)',
  'ubt-green': 'var(--kali-success-500)',
  'ubt-gedit-orange': 'var(--kali-secondary-400)',
  'ubt-gedit-blue': 'var(--kali-primary-400)',
  'ubt-gedit-dark': 'var(--kali-primary-700)',
  'ub-border-orange': 'var(--color-accent-border)',
  'ub-dark-grey': 'var(--kali-neutral-800)',
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
        ...kaliPalette,
        ...legacyPalette,
      },
      fontFamily: {
        ubuntu: ['Ubuntu', 'sans-serif'],
      },
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
