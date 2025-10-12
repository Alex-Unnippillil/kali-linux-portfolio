import { formatCookie } from '../utils/cookies';

describe('formatCookie', () => {
  it('builds a cookie string with attributes', () => {
    expect(
      formatCookie('csrfToken', 'abc', {
        httpOnly: true,
        path: '/',
        sameSite: 'Strict',
        secure: true,
      })
    ).toBe('csrfToken=abc; HttpOnly; Path=/; SameSite=Strict; Secure');
  });

  it('omits optional attributes when not provided', () => {
    expect(formatCookie('hello', 'world')).toBe('hello=world');
  });
});
