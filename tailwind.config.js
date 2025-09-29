const plugin = require('tailwindcss/plugin');
const themeTokens = require('./styles/theme-tokens.js');

const {
  colors: themeColors,
  spacing: themeSpacing,
  radii: themeRadii,
  shadows: themeShadows,
  motion: themeMotion,
  zIndex: themeZIndex,
} = themeTokens;

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
        'ub-grey': themeColors.ubuntu.grey,
        'ub-warm-grey': themeColors.ubuntu.warmGrey,
        'ub-cool-grey': themeColors.ubuntu.coolGrey,
        'ub-orange': themeColors.ubuntu.orange,
        'ub-lite-abrgn': themeColors.ubuntu.liteAubergine,
        'ub-med-abrgn': themeColors.ubuntu.mediumAubergine,
        'ub-drk-abrgn': themeColors.ubuntu.darkAubergine,
        'ub-window-title': themeColors.ubuntu.windowTitle,
        'ub-gedit-dark': themeColors.ubuntu.gedit.dark,
        'ub-gedit-light': themeColors.ubuntu.gedit.light,
        'ub-gedit-darker': themeColors.ubuntu.gedit.darker,
        'ubt-grey': themeColors.ubuntuTango.grey,
        'ubt-warm-grey': themeColors.ubuntuTango.warmGrey,
        'ubt-cool-grey': themeColors.ubuntuTango.coolGrey,
        'ubt-blue': themeColors.ubuntuTango.blue,
        'ubt-green': themeColors.ubuntuTango.green,
        'ubt-gedit-orange': themeColors.ubuntuTango.geditOrange,
        'ubt-gedit-blue': themeColors.ubuntuTango.geditBlue,
        'ubt-gedit-dark': themeColors.ubuntuTango.geditDark,
        'ub-border-orange': themeColors.ubuntu.borderOrange,
        'ub-dark-grey': themeColors.ubuntu.darkGrey,
        kali: {
          background: themeColors.background,
          text: themeColors.text,
          primary: themeColors.primary,
          secondary: themeColors.secondary,
          accent: themeColors.accent,
          muted: themeColors.muted,
          surface: themeColors.surface,
          inverse: themeColors.inverse,
          border: themeColors.border,
          terminal: themeColors.terminal,
          dark: themeColors.dark,
          focus: themeColors.focusRing,
          selection: themeColors.selection,
          control: themeColors.controlAccent,
          backdrop: themeColors.kaliBg,
        },
      },
      spacing: {
        xs: themeSpacing.xs,
        sm: themeSpacing.sm,
        md: themeSpacing.md,
        lg: themeSpacing.lg,
        xl: themeSpacing.xl,
        '2xl': themeSpacing['2xl'],
      },
      borderRadius: {
        sm: themeRadii.sm,
        md: themeRadii.md,
        lg: themeRadii.lg,
        xl: themeRadii.xl,
        pill: themeRadii.pill,
      },
      boxShadow: {
        soft: themeShadows.soft,
        'kali-panel': themeShadows.panel,
        'menu-overlay': themeShadows.menu,
      },
      transitionDuration: {
        fast: themeMotion.fast,
        medium: themeMotion.medium,
        slow: themeMotion.slow,
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
        ...themeZIndex,
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
