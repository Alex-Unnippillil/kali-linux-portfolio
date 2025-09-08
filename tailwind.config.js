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
          bg: 'var(--color-bg)',
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
          info: 'var(--kali-info)',
          success: 'var(--kali-success)',
          warning: 'var(--kali-warning)',
          danger: 'var(--kali-danger)',
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
      },
        fontFamily: {
          ubuntu: ['Ubuntu', 'sans-serif'],
        },
        fontSize: {
          base: ['1rem', { lineHeight: '1.5' }],
          h1: ['clamp(1.875rem, 1.5rem + 1vw, 2.25rem)', { lineHeight: '1.2' }],
          h2: ['clamp(1.5rem, 1.25rem + 0.5vw, 1.875rem)', { lineHeight: '1.3' }],
          h3: ['clamp(1.25rem, 1rem + 0.5vw, 1.5rem)', { lineHeight: '1.4' }],
        },
      spacing: {
        'space-0': '0px',
        'space-1': '8px',
        'space-2': '16px',
        'space-3': '24px',
        'space-4': '32px',
        'space-5': '40px',
        'space-6': '48px',
        'space-7': '56px',
        'space-8': '64px',
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
      boxShadow: {
        // eslint-disable-next-line no-top-level-window/no-top-level-window-or-document
        window: '0 4px 8px rgba(0,0,0,0.3)',
        card: '0 2px 4px rgba(0,0,0,0.2)',
      },
      borderColor: {
        // eslint-disable-next-line no-top-level-window/no-top-level-window-or-document
        window: 'var(--color-border)',
        card: 'var(--color-border)',
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
        'scale-in': {
          '0%': { transform: 'scale(0)' },
          '100%': { transform: 'scale(1)' },
        },
        'merge-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      animation: {
        glow: 'glow 1s ease-in-out infinite',
        flourish: 'flourish 0.6s ease-out',
        mine: 'mine 0.4s ease-in-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'merge-pulse': 'merge-pulse 0.3s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    plugin(function ({ addUtilities, addVariant }) {
      addVariant('hc', '.high-contrast &');
      addVariant('rm', '.reduced-motion &');
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
