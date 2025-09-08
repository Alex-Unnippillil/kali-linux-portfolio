/** @jest-environment node */

jest.mock('next/server', () => ({
  NextResponse: { next: () => ({ headers: new Headers() }) },
}));

jest.mock('@ducanh2912/next-pwa', () => ({
  __esModule: true,
  default: () => (config: any) => config,
}));

jest.mock('@next/bundle-analyzer', () => () => (config: any) => config);

describe('Strict-Transport-Security header', () => {
  it('is set by middleware', () => {
    const { middleware } = require('../middleware');
    const req = { headers: new Headers({ accept: 'text/html' }) } as any;
    const res = middleware(req);
    expect(res.headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );
  });

  it('is included in next.config headers', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const config = require('../next.config.js');
    const headers = await config.headers();
    process.env.NODE_ENV = prev;

    const hasHsts = headers.some(({ headers }: any) =>
      headers.some(
        (h: any) =>
          h.key === 'Strict-Transport-Security' &&
          h.value === 'max-age=63072000; includeSubDomains; preload'
      )
    );
    expect(hasHsts).toBe(true);
  });
});
