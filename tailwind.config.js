const plugin = require('tailwindcss/plugin');

const withAlpha = (cssVar) => `rgb(var(${cssVar}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
    './scripts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
      },
      colors: {
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
        kali: {
          background: withAlpha('--color-bg-rgb'),
          text: withAlpha('--color-text-rgb'),
          primary: withAlpha('--color-primary-rgb'),
          secondary: withAlpha('--color-secondary-rgb'),
          accent: withAlpha('--color-accent-rgb'),
          success: withAlpha('--color-success-rgb'),
          danger: withAlpha('--color-error-rgb'),
          error: withAlpha('--color-error-rgb'),
          muted: withAlpha('--color-muted-rgb'),
          surface: {
            DEFAULT: withAlpha('--color-surface-rgb'),
            muted: withAlpha('--color-surface-muted-rgb'),
            raised: withAlpha('--color-surface-raised-rgb'),
          },
          inverse: withAlpha('--color-inverse-rgb'),
          border: withAlpha('--color-border-rgb'),
          terminal: withAlpha('--color-terminal-rgb'),
          dark: withAlpha('--color-dark-rgb'),
          focus: withAlpha('--color-focus-ring-rgb'),
          selection: withAlpha('--color-selection-rgb'),
          control: withAlpha('--color-control-accent-rgb'),
          backdrop: withAlpha('--kali-bg-rgb'),
          panel: withAlpha('--kali-panel-rgb'),
          'panel-dark': withAlpha('--kali-panel-rgb'),
          'panel-light':
            'color-mix(in srgb, var(--kali-panel) 55%, rgba(255,255,255,0.18))',
          overlay: withAlpha('--color-overlay-strong-rgb'),
          'overlay-soft': withAlpha('--color-overlay-soft-rgb'),
          info: withAlpha('--color-info-rgb'),
          severity: {
            low: withAlpha('--color-severity-low-rgb'),
            medium: withAlpha('--color-severity-medium-rgb'),
            high: withAlpha('--color-severity-high-rgb'),
            critical: withAlpha('--color-severity-critical-rgb'),
          },
        },
        game: {
          danger: withAlpha('--game-danger-rgb'),
        },
      },
      // Custom shadow for Kali-style floating panels
      boxShadow: {
        'kali-panel': '0 6px 20px rgba(0,0,0,.35)',
      },
      fontFamily: {
        ubuntu: ['Rajdhani', 'Segoe UI', 'sans-serif'],
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
          '0%, 100%': { boxShadow: '0 0 0px rgb(var(--color-accent-rgb) / 0)' },
          '50%': { boxShadow: '0 0 10px rgb(var(--color-accent-rgb) / 0.65)' },
        },
        flourish: {
          '0%': { transform: 'scale(0.8) rotate(0deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
        },
        mine: {
          '0%': {
            transform: 'translate(0,0) scale(1)',
            backgroundColor: 'rgb(var(--game-danger-rgb) / 1)',
          },
          '50%': {
            transform: 'translate(-1px,1px) scale(1.1)',
            backgroundColor: 'rgb(var(--game-danger-rgb) / 0.85)',
          },
          '100%': {
            transform: 'translate(0,0) scale(1)',
            backgroundColor: 'rgb(var(--game-danger-rgb) / 1)',
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
