const { POST, DELETE } = require('@/src/app/api/session/route');

class MockResponse {
  status: number;
  headersMap: Map<string, string>;
  headers: { get: (name: string) => string | null };

  constructor(_body?: any, init: any = {}) {
    this.status = init.status ?? 200;
    this.headersMap = new Map<string, string>();
    if (init.headers) {
      for (const [k, v] of Object.entries(init.headers)) {
        this.headersMap.set(k.toLowerCase(), String(v));
      }
    }
    this.headers = {
      get: (name: string) => this.headersMap.get(name.toLowerCase()) || null,
    };
  }
}

(global as any).Response = MockResponse as any;

describe('session route', () => {
  test('rejects empty username or password', async () => {
    const req = { json: () => Promise.resolve({ username: '', password: '' }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('sets cookie when credentials provided', async () => {
    const req = { json: () => Promise.resolve({ username: 'user', password: 'pass' }) } as any;
    const res = await POST(req);
    const cookie = res.headers.get('set-cookie') || '';

    expect(res.status).toBe(200);
    expect(cookie).toContain('portfolio_session=1');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Max-Age=28800');
  });

  test('clears cookie on DELETE', async () => {
    const res = await DELETE();
    const cookie = res.headers.get('set-cookie') || '';

    expect(res.status).toBe(200);
    expect(cookie).toContain('portfolio_session=');
    expect(cookie).toContain('Max-Age=0');
  });
});
