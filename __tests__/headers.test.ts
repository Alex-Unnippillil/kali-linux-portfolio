/**
 * @jest-environment node
 */
import type { NextConfig } from 'next';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
type HeaderRoute = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

describe('security headers', () => {
  let headerMap!: Map<string, string>;
  let nextConfig: NextConfig & { headers?: () => Promise<HeaderRoute[]> };

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_STATIC_EXPORT = 'false';

    jest.resetModules();
    nextConfig = require('../next.config.js');

    expect(typeof nextConfig.headers).toBe('function');

    const routes = (await nextConfig.headers?.()) ?? [];
    const defaultRoute = routes.find((route) => route.source === '/(.*)');

    expect(defaultRoute).toBeDefined();

    headerMap = new Map(
      defaultRoute.headers.map(({ key, value }: HeaderRoute['headers'][number]) => [
        key.toLowerCase(),
        value,
      ])
    );
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
    jest.resetModules();
  });

  it('sets a strict Content-Security-Policy', () => {
    const csp = headerMap.get('content-security-policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it('enforces Strict-Transport-Security', () => {
    expect(headerMap.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );
  });

  it('applies Referrer-Policy and Permissions-Policy', () => {
    expect(headerMap.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin'
    );
    expect(headerMap.get('permissions-policy')).toBe(
      'camera=(), microphone=(), geolocation=*'
    );
  });

  it('prevents MIME sniffing and clickjacking', () => {
    expect(headerMap.get('x-content-type-options')).toBe('nosniff');
    expect(headerMap.get('x-frame-options')).toBe('SAMEORIGIN');
  });
});

