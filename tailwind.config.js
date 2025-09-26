const plugin = require('tailwindcss/plugin');
const { typographyScale, lineHeights } = require('./lib/typography-scale');

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
          background: 'var(--color-bg)',
          text: 'var(--color-text)',
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--color-accent)',
          muted: 'var(--color-muted)',
          surface: 'var(--color-surface)',
          inverse: 'var(--color-inverse)',
          border: 'var(--color-border)',
          terminal: 'var(--color-terminal)',
          dark: 'var(--color-dark)',
          focus: 'var(--color-focus-ring)',
          selection: 'var(--color-selection)',
          control: 'var(--color-control-accent)',
          backdrop: 'var(--kali-bg)',
        },
      },
      boxShadow: {
        'kali-panel': '0 6px 20px rgba(0,0,0,.35)',
      },
      fontFamily: {
        sans: ['var(--font-family-base)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-family-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        ubuntu: ['Ubuntu', 'sans-serif'],
      },
      fontSize: {
        xs: [typographyScale.body.xs, { lineHeight: lineHeights.standard }],
        sm: [typographyScale.body.sm, { lineHeight: lineHeights.standard }],
        base: [typographyScale.body.md, { lineHeight: lineHeights.standard }],
        lg: [typographyScale.body.lg, { lineHeight: lineHeights.standard }],
        xl: [typographyScale.heading.xs, { lineHeight: lineHeights.snug }],
        '2xl': [typographyScale.heading.sm, { lineHeight: lineHeights.snug }],
        '3xl': [typographyScale.heading.md, { lineHeight: lineHeights.tight }],
        '4xl': [typographyScale.heading.lg, { lineHeight: lineHeights.tight }],
        '5xl': [typographyScale.display.sm, { lineHeight: lineHeights.tight }],
        '6xl': [typographyScale.display.md, { lineHeight: lineHeights.tight }],
        '7xl': [typographyScale.display.lg, { lineHeight: lineHeights.tight }],
      },
      lineHeight: {
        tight: String(lineHeights.tight),
        snug: String(lineHeights.snug),
        normal: String(lineHeights.standard),
        relaxed: String(lineHeights.relaxed),
        mono: String(lineHeights.mono),
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
