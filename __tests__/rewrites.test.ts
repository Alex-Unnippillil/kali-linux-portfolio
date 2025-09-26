jest.mock('@next/bundle-analyzer', () => () => (config: unknown) => config);
jest.mock('@ducanh2912/next-pwa', () => ({
  __esModule: true,
  default: () => (config: unknown) => config,
}));

describe('Next.js rewrites', () => {
  it('rewrites legacy tool routes to the new app locations', async () => {
    const config = require('../next.config.js');

    expect(config.rewrites).toBeDefined();

    const rewrites = await config.rewrites();

    expect(rewrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/tools',
          destination: '/apps',
        }),
        expect.objectContaining({
          source: '/tools/:path*',
          destination: '/apps/:path*',
        }),
      ]),
    );
  });
});
