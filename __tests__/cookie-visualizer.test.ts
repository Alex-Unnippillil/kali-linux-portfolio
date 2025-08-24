import { parseSetCookies } from '../lib/cookie-visualizer';

describe('cookie visualizer parser', () => {
  it('identifies secure attributes and ratings', () => {
    const cookies = parseSetCookies([
      'session=abc; Secure; HttpOnly; SameSite=Strict; Path=/; Expires=Wed, 09 Jun 2099 10:18:14 GMT',
    ]);
    expect(cookies[0].secure).toBe(true);
    expect(cookies[0].httpOnly).toBe(true);
    expect(cookies[0].sameSite).toBe('Strict');
    expect(cookies[0].rating).toBe('A');
  });

  it('flags missing attributes', () => {
    const cookies = parseSetCookies(['id=1']);
    expect(cookies[0].issues.length).toBeGreaterThan(0);
    expect(cookies[0].rating).toBe('F');
  });
});
