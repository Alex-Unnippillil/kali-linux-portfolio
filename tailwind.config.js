module.exports = {
  mode: 'jit',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './apps/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    backgroundColor: theme => ({
      ...theme('colors'),
      surface: '#111111',
      warm: '#AEA79F',
      panel: '#333333',
      accent: '#E95420',
      'brand-light': '#77216F',
      brand: '#5E2750',
      'brand-dark': '#2C001E',
      'window-title': '#201f1f',
      'gedit-dark': '#021B33',
      'gedit-light': '#003B70',
      'gedit-darker': '#010D1A',
      blue: '#3465A4',
      green: '#4E9A06',
    }),
    textColor: theme => ({
      ...theme('colors'),
      text: '#F6F6F5',
      warm: '#AEA79F',
      panel: '#333333',
      blue: '#3465A4',
      green: '#4E9A06',
      'gedit-orange': '#F39A21',
      'gedit-blue': '#50B6C6',
      'gedit-dark': '#003B70',
    }),
    borderColor: theme => ({
      ...theme('colors'),
      DEFAULT: theme('colors.gray.300', 'currentColor'),
      accent: '#E95420'
    }),
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
    extend: {
      zIndex: {
        '-10': '-10',
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
