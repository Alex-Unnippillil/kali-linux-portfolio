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
        // Kali semantic palette
        'kali-bg': 'var(--color-bg)',
        'kali-surface': 'var(--color-surface)',
        'kali-elevated': 'var(--color-elevated)',
        'kali-panel': 'var(--kali-panel)',
        'kali-overlay': 'var(--kali-overlay)',
        'kali-border': 'var(--color-border)',
        'kali-muted': 'var(--color-muted)',
        'kali-dark': 'var(--color-dark)',
        'kali-text': 'var(--color-text)',
        'kali-text-muted': 'var(--color-text-muted)',
        'kali-primary': 'var(--color-primary)',
        'kali-primary-soft': 'var(--color-primary-soft)',
        'kali-primary-strong': 'var(--color-primary-strong)',
        'kali-secondary': 'var(--color-secondary)',
        'kali-secondary-soft': 'var(--color-secondary-soft)',
        'kali-secondary-strong': 'var(--color-secondary-strong)',
        'status-secondary': 'var(--game-color-secondary)',
        'status-success': 'var(--game-color-success)',
        'status-warning': 'var(--game-color-warning)',
        'status-danger': 'var(--game-color-danger)',

        // Scales
        'kali-primary-50': 'var(--kali-primary-50)',
        'kali-primary-100': 'var(--kali-primary-100)',
        'kali-primary-200': 'var(--kali-primary-200)',
        'kali-primary-300': 'var(--kali-primary-300)',
        'kali-primary-400': 'var(--kali-primary-400)',
        'kali-primary-500': 'var(--kali-primary-500)',
        'kali-primary-600': 'var(--kali-primary-600)',
        'kali-primary-700': 'var(--kali-primary-700)',
        'kali-primary-800': 'var(--kali-primary-800)',
        'kali-primary-900': 'var(--kali-primary-900)',
        'kali-primary-950': 'var(--kali-primary-950)',
        'kali-secondary-50': 'var(--kali-secondary-50)',
        'kali-secondary-100': 'var(--kali-secondary-100)',
        'kali-secondary-200': 'var(--kali-secondary-200)',
        'kali-secondary-300': 'var(--kali-secondary-300)',
        'kali-secondary-400': 'var(--kali-secondary-400)',
        'kali-secondary-500': 'var(--kali-secondary-500)',
        'kali-secondary-600': 'var(--kali-secondary-600)',
        'kali-secondary-700': 'var(--kali-secondary-700)',
        'kali-secondary-800': 'var(--kali-secondary-800)',
        'kali-secondary-900': 'var(--kali-secondary-900)',
        'kali-secondary-950': 'var(--kali-secondary-950)',
        'kali-neutral-50': 'var(--kali-neutral-50)',
        'kali-neutral-100': 'var(--kali-neutral-100)',
        'kali-neutral-200': 'var(--kali-neutral-200)',
        'kali-neutral-300': 'var(--kali-neutral-300)',
        'kali-neutral-400': 'var(--kali-neutral-400)',
        'kali-neutral-500': 'var(--kali-neutral-500)',
        'kali-neutral-600': 'var(--kali-neutral-600)',
        'kali-neutral-700': 'var(--kali-neutral-700)',
        'kali-neutral-800': 'var(--kali-neutral-800)',
        'kali-neutral-900': 'var(--kali-neutral-900)',
        'kali-neutral-950': 'var(--kali-neutral-950)',
        'kali-orange-300': 'var(--kali-orange-300)',
        'kali-orange-400': 'var(--kali-orange-400)',
        'kali-orange-500': 'var(--kali-orange-500)',
        'kali-indigo-300': 'var(--kali-indigo-300)',
        'kali-indigo-400': 'var(--kali-indigo-400)',
        'kali-indigo-500': 'var(--kali-indigo-500)',
        'kali-indigo-600': 'var(--kali-indigo-600)',
        'kali-indigo-700': 'var(--kali-indigo-700)',

        // Legacy aliases (scheduled for removal)
        'ub-grey': 'var(--kali-neutral-900)',
        'ub-warm-grey': 'var(--kali-neutral-400)',
        'ub-cool-grey': 'var(--kali-neutral-800)',
        'ub-orange': 'var(--color-primary)',
        'ub-lite-abrgn': 'var(--kali-neutral-700)',
        'ub-med-abrgn': 'var(--kali-neutral-800)',
        'ub-drk-abrgn': 'var(--kali-neutral-900)',
        'ub-window-title': 'var(--kali-neutral-950)',
        'ub-gedit-dark': 'var(--kali-indigo-600)',
        'ub-gedit-light': 'var(--kali-indigo-500)',
        'ub-gedit-darker': 'var(--kali-indigo-700)',
        'ubt-grey': 'var(--kali-neutral-50)',
        'ubt-warm-grey': 'var(--kali-neutral-200)',
        'ubt-cool-grey': 'var(--kali-neutral-600)',
        'ubt-blue': 'var(--kali-primary-300)',
        'ubt-green': 'var(--game-color-success)',
        'ubt-gedit-orange': 'var(--kali-orange-400)',
        'ubt-gedit-blue': 'var(--kali-secondary-500)',
        'ubt-gedit-dark': 'var(--kali-indigo-500)',
        'ub-border-orange': 'var(--color-primary-strong)',
        'ub-dark-grey': 'var(--kali-neutral-600)',
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
