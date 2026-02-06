const createUrl = (base, path) => {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(path.replace(/^\//, ''), normalizedBase).href;
};

const canaryBaseUrl =
  process.env.LHCI_CANARY_BASE_URL ||
  (process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined);

if (!canaryBaseUrl) {
  throw new Error(
    'Missing canary preview URL. Set LHCI_CANARY_BASE_URL or VERCEL_BRANCH_URL so Lighthouse CI knows which deployment to audit.',
  );
}

const targetRoutes = ['/', '/apps', '/profile', '/video-gallery'];

module.exports = {
  ci: {
    collect: {
      url: targetRoutes.map((path) => createUrl(canaryBaseUrl, path)),
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'metrics/lcp': ['error', { maxNumericValue: 2500, aggregationMethod: 'median' }],
        'metrics/inp': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }],
        'metrics/cls': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    lighthouse: {
      settings: {
        budgets: targetRoutes.map((path) => ({
          path,
          timings: [
            { metric: 'largest-contentful-paint', budget: 2500 },
            { metric: 'interaction-to-next-paint', budget: 200 },
          ],
          viewport: '1350,940',
          resourceCounts: [],
          resourceSizes: [],
          scores: [
            { metric: 'cumulative-layout-shift', budget: 0.1 },
          ],
        })),
      },
    },
  },
};
