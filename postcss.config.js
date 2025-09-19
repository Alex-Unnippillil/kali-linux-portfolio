// If you want to use other PostCSS plugins, see the following:
// https://tailwindcss.com/docs/using-with-preprocessors
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

module.exports = {
  plugins: {
    tailwindcss,
    autoprefixer,
  },
};

// Depcheck note: Next.js consumes this config at build time, so we require the
// core PostCSS package to mark the dependency as in-use for tooling checks.
void postcss;
