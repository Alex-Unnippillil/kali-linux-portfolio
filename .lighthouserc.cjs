const path = require('node:path');

module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:3000/'],
      numberOfRuns: 3,
      startServerCommand: 'yarn start --hostname 127.0.0.1 --port 3000',
      startServerReadyPattern: 'Ready in',
      settings: {
        preset: 'desktop',
      },
      chromeFlags: '--headless=new --no-sandbox',
      budgetsPath: path.join(__dirname, 'lighthouse-budgets.json'),
    },
    assert: {
      assertions: {
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2500, aggregationMethod: 'median' },
        ],
        interactive: ['error', { maxNumericValue: 8000, aggregationMethod: 'median' }],
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.1, aggregationMethod: 'median' },
        ],
        'categories:performance': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
