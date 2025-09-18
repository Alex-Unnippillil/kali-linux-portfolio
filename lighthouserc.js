const previewUrl =
  process.env.LHCI_PREVIEW_URL ||
  process.env.VERCEL_DEPLOYMENT_URL ||
  process.env.VERCEL_URL ||
  'http://localhost:3000';

/** @type {import('@lhci/cli').LighthouseCiConfig} */
module.exports = {
  ci: {
    collect: {
      url: [previewUrl],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox',
        budgets: [
          {
            path: '/*',
            resourceSizes: [
              {
                resourceType: 'script',
                budget: 350,
              },
            ],
            timings: [
              {
                metric: 'largest-contentful-paint',
                budget: 4000,
              },
              {
                metric: 'cumulative-layout-shift',
                budget: 0.1,
              },
            ],
          },
        ],
      },
    },
    assert: {
      assertions: {
        'categories:performance': 'warn',
        'largest-contentful-paint': [
          'error',
          {
            maxNumericValue: 4000,
            aggregationMethod: 'median',
          },
        ],
        'interaction-to-next-paint': [
          'error',
          {
            maxNumericValue: 200,
            aggregationMethod: 'median',
          },
        ],
        'cumulative-layout-shift': [
          'error',
          {
            maxNumericValue: 0.1,
            aggregationMethod: 'median',
          },
        ],
        'total-byte-weight': [
          'error',
          {
            maxNumericValue: 500000,
            aggregationMethod: 'median',
          },
        ],
        'performance-budget': [
          'error',
          {
            minScore: 1,
          },
        ],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    githubStatus: {
      context: 'lhci/vercel-preview',
    },
  },
};
