module.exports = {
  ci: {
    collect: {
      url: [
        '/',
        '/apps',
        '/apps/code-editor',
        '/apps/monaco',
        '/apps/chess',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'mobile',
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', {maxNumericValue: 2500, aggregationMethod: 'optimistic'}],
        'experimental-interaction-to-next-paint': ['error', {maxNumericValue: 200, aggregationMethod: 'optimistic'}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1, aggregationMethod: 'pessimistic'}],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
