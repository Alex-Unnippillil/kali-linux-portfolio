import handler from '../pages/api/inbox/unread-count';

class MockResponse {
  private body: string;
  status: number;
  headers: Record<string, string>;

  constructor(body: string, init: { status?: number; headers?: Record<string, string> } = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.headers = init.headers ?? {};
  }

  async json() {
    return JSON.parse(this.body);
  }
}

global.Response = MockResponse as unknown as typeof global.Response;

describe('unread count api', () => {
  it('returns an unread count', async () => {
    const res = await handler();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.unread).toBe('number');
  });
});
