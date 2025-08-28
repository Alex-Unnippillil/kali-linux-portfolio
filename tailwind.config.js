module.exports = {
  mode: 'jit',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './apps/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
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
  plugins: [],
};
