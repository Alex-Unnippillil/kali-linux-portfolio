const plugin = require('tailwindcss/plugin');

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
        'ub-grey': 'var(--color-kali-midnight)',
        'ub-warm-grey': 'var(--color-kali-ash)',
        'ub-cool-grey': 'var(--color-kali-surface)',
        'ub-orange': 'var(--color-kali-electric)',
        'ub-lite-abrgn': 'var(--color-kali-surface-alt)',
        'ub-med-abrgn': 'var(--color-kali-panel)',
        'ub-drk-abrgn': 'var(--color-kali-panel-dark)',
        'ub-window-title': 'var(--color-kali-window-title)',
        'ub-gedit-dark': 'var(--color-kali-depth)',
        'ub-gedit-light': 'var(--color-kali-navy)',
        'ub-gedit-darker': 'var(--color-kali-shadow)',
        'ubt-grey': 'var(--color-kali-ice)',
        'ubt-warm-grey': 'var(--color-kali-ash)',
        'ubt-cool-grey': 'var(--color-kali-graphite)',
        'ubt-blue': 'var(--color-kali-sky)',
        'ubt-green': 'var(--color-kali-neon)',
        'ubt-gedit-orange': 'var(--color-kali-amber)',
        'ubt-gedit-blue': 'var(--color-kali-cyan)',
        'ubt-gedit-dark': 'var(--color-kali-navy)',
        'ub-border-orange': 'var(--color-kali-electric-border)',
        'ub-dark-grey': 'var(--color-kali-slate)',
      },
      fontFamily: {
        ubuntu: ['Hack', 'DejaVu Sans Mono', 'monospace'],
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
