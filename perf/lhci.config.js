const base = process.env.LHCI_BASE_URL || 'http://localhost:3000';

module.exports = {
  ci: {
    collect: {
      url: [
        `${base}/`,
        `${base}/apps`,
        `${base}/apps/vscode`,
        `${base}/apps/project-gallery`,
        `${base}/apps/chess`,
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'mobile',
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'optimistic' }],
        'experimental-interaction-to-next-paint': ['error', { maxNumericValue: 200, aggregationMethod: 'optimistic' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'pessimistic' }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
