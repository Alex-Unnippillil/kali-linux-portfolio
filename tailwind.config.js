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
        'kali-grey': 'var(--kali-grey)',
        'kali-warm-grey': 'var(--kali-warm-grey)',
        'kali-cool-grey': 'var(--kali-cool-grey)',
        'kali-accent': 'var(--kali-accent)',
        'kali-panel-light': 'var(--kali-panel-light)',
        'kali-panel-mid': 'var(--kali-panel-mid)',
        'kali-panel-dark': 'var(--kali-panel-dark)',
        'kali-window-title': 'var(--kali-window-title)',
        'kali-gedit-dark': 'var(--kali-gedit-dark)',
        'kali-gedit-light': 'var(--kali-gedit-light)',
        'kali-gedit-darker': 'var(--kali-gedit-darker)',
        'kali-light-grey': 'var(--kali-light-grey)',
        'kali-light-warm-grey': 'var(--kali-light-warm-grey)',
        'kali-light-cool-grey': 'var(--kali-light-cool-grey)',
        'kali-light-blue': 'var(--kali-light-blue)',
        'kali-light-green': 'var(--kali-light-green)',
        'kali-light-gedit-orange': 'var(--kali-light-gedit-orange)',
        'kali-light-gedit-blue': 'var(--kali-light-gedit-blue)',
        'kali-light-gedit-dark': 'var(--kali-light-gedit-dark)',
        'kali-accent-border': 'var(--kali-accent-border)',
        'kali-dark-grey': 'var(--kali-dark-grey)',
        kali: {
          background: 'var(--color-bg)',
          text: 'var(--color-text)',
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--kali-accent)',
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
