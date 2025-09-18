/**
 * @type {import('@lhci/cli').LighthouseCiConfig}
 */
module.exports = {
  ci: {
    collect: {
      url: [process.env.LHCI_TARGET_URL || 'http://localhost:3000/apps/alex'],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        onlyCategories: ['accessibility', 'best-practices', 'performance'],
        chromeFlags: ['--no-sandbox'],
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'metrics:cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.05, aggregationMethod: 'p75' },
        ],
        'categories:performance': 'off',
        'categories:seo': 'off',
        'categories:pwa': 'off',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: 'lhci-report',
      reportFilenamePattern: 'lh-report-%%PATHNAME%%-%%DATETIME%%.html',
    },
  },
};
