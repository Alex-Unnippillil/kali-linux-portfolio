module.exports = {
  extends: ['next/core-web-vitals'],
  plugins: ['no-top-level-window'],
  rules: {
    '@next/next/no-page-custom-font': 'off',
    '@next/next/no-img-element': 'off',
    'no-top-level-window/no-top-level-window-or-document': 'error',
  },
};
