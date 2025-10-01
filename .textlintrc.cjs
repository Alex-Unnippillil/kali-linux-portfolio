const microcopyRule = require('./plugins/textlint/rules/microcopy-banned-phrases');

module.exports = {
  rules: {
    'microcopy-banned-phrases': {
      phrases: microcopyRule.DEFAULT_PHRASES,
    },
  },
};
