const chromePath = process.env.LHCI_CHROME_PATH || process.env.CHROME_PATH;

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 2,
      startServerCommand: 'yarn start --port=3000',
      startServerReadyPattern: 'ready - started server on',
      url: ['http://localhost:3000/'],
      disableStorageReset: true,
      settings: {
        preset: 'desktop',
        throttlingMethod: 'devtools',
        throttling: {
          cpuSlowdownMultiplier: 1,
          downloadThroughputKbps: 10000,
          uploadThroughputKbps: 10000,
          requestLatencyMs: 20,
        },
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
      ...(chromePath ? { chromePath } : {}),
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:seo': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci/reports',
    },
  },
};
