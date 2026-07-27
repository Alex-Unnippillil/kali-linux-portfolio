import handler from '../pages/api/users/[id]/blackjack';
import { rateLimit } from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';

function createToken(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const payload = Buffer.from(JSON.stringify({ sub }))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${payload}.signature`;
}

describe('users/[id]/blackjack api', () => {
  beforeEach(() => {
    rateLimit.clear();
  });

  test('rejects mismatched subject', async () => {
    const token = createToken('user-123');
    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      query: { id: 'user-456' },
    });
    (req.socket as any).remoteAddress = '9.9.9.9';

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData()).toEqual({ ok: false, code: 'forbidden' });
  });

  test('allows matching subject', async () => {
    const token = createToken('user-123');
    const { req, res } = createMocks({
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      query: { id: 'user-123' },
    });
    (req.socket as any).remoteAddress = '8.8.8.8';

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ ok: true });
  });
});

