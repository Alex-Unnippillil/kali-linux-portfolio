class HeaderCollection {
  private store = new Map<string, string>();

  constructor(init?: Record<string, string>) {
    if (init) {
      for (const [key, value] of Object.entries(init)) {
        this.set(key, value);
      }
    }
  }

  set(key: string, value: string) {
    this.store.set(key.toLowerCase(), value);
  }

  get(key: string) {
    return this.store.get(key.toLowerCase()) ?? null;
  }
}

jest.mock('next/server', () => {
  class MockNextResponse {
    public status: number;
    public headers: HeaderCollection;
    public body?: string;

    constructor(body?: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new HeaderCollection(init?.headers);
    }

    static next() {
      return new MockNextResponse(undefined);
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

import { middleware } from '../middleware';

type NextRequestLike = Parameters<typeof middleware>[0];

describe('middleware', () => {
  function createRequest(headersInit?: Record<string, string>): NextRequestLike {
    const headers = new HeaderCollection(headersInit);
    return {
      headers: headers as unknown as Headers,
    } as NextRequestLike;
  }

  it('blocks middleware subrequests with a 403 response', () => {
    const req = createRequest({ 'x-middleware-subrequest': '1' });

    const res = middleware(req);

    expect(res.status).toBe(403);
    expect(res.headers.get('x-csp-nonce')).toBeNull();
  });

  it('adds CSP headers for normal requests', () => {
    const req = createRequest();

    const res = middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-csp-nonce')).toBeTruthy();
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });
});
