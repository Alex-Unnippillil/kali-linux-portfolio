module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 1,
    },
    assert: {
      preset: 'lighthouse:recommended',
      budgetsFile: 'lighthouse-budgets.json',
    },
  },
};
