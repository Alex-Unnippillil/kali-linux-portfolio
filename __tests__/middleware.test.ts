import type { NextRequest } from 'next/server';

jest.mock('next/server', () => {
  class HeadersMock {
    private readonly map = new Map<string, string>();

    get(name: string) {
      return this.map.get(name.toLowerCase()) ?? null;
    }

    set(name: string, value: string) {
      this.map.set(name.toLowerCase(), value);
    }

    has(name: string) {
      return this.map.has(name.toLowerCase());
    }

    delete(name: string) {
      this.map.delete(name.toLowerCase());
    }
  }

  class MockResponse {
    headers: HeadersMock;

    constructor() {
      this.headers = new HeadersMock();
    }

    static next() {
      return new MockResponse();
    }
  }

  return { NextResponse: MockResponse };
});

beforeAll(() => {
  if (!(globalThis as any).Request) {
    (globalThis as any).Request = class {};
  }
});

describe('middleware CSP headers', () => {
  it('sets CSP headers with nonce and trusted types', async () => {
    const { middleware } = await import('../middleware');
    const request = { nextUrl: new URL('https://example.com/') } as unknown as NextRequest;
    const response = middleware(request);

    const nonce = response.headers.get('x-csp-nonce');
    expect(nonce).toBeTruthy();

    const headerName = response.headers.has('Content-Security-Policy')
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only';

    const csp = response.headers.get(headerName);
    expect(csp).toBeTruthy();
    if (!csp) {
      throw new Error('CSP header missing');
    }
    expect(/script-src [^;]*'unsafe-inline'/.test(csp)).toBe(false);
    expect(csp).toContain('trusted-types app-html dompurify');
    expect(response.headers.get('Report-To')).toContain('/api/csp-report');
  });
});
