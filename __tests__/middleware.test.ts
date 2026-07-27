import type { NextRequest } from 'next/server';

class MockNextResponse {
  status = 200;
  headers = new Map<string, string>();
  static next() {
    return new MockNextResponse();
  }
  static redirect(url: URL) {
    const res = new MockNextResponse();
    res.status = 307;
    res.headers.set('location', url.toString());
    return res;
  }
}

jest.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}));

const { middleware } = require('../middleware');

function makeRequest(path: string, cookie?: string): NextRequest {
  const url = new URL(`http://example.com${path}`);
  return {
    nextUrl: {
      pathname: url.pathname,
      clone: () => new URL(url.toString()),
    } as any,
    cookies: {
      get: (name: string) => {
        if (!cookie) return undefined;
        const [k, v] = cookie.split('=');
        return k === name ? { value: v } : undefined;
      },
    },
  } as unknown as NextRequest;
}

describe('middleware authentication redirects', () => {
  it('redirects unauthenticated users to /login', () => {
    const req = makeRequest('/dashboard');
    const res = middleware(req);
    expect(res.headers.get('location')).toBe('http://example.com/login');
  });

  it('redirects authenticated users away from /login', () => {
    const req = makeRequest('/login', 'auth=1');
    const res = middleware(req);
    expect(res.headers.get('location')).toBe('http://example.com/');
  });

  it('allows unauthenticated users to access /login', () => {
    const req = makeRequest('/login');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeUndefined();
  });

  it('allows authenticated users to access other routes', () => {
    const req = makeRequest('/dashboard', 'auth=1');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeUndefined();
  });
});

