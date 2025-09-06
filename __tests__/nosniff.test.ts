function makeReq(accept: string) {
  return { headers: new Headers({ accept }) } as any;
}

jest.mock('next/server', () => ({
  NextResponse: { next: () => ({ headers: new Headers() }) },
}));

const { middleware } = require('../middleware');

describe('X-Content-Type-Options header', () => {
  it('sets nosniff for HTML responses', () => {
    const res = middleware(makeReq('text/html'));
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('does not set nosniff for non-HTML responses', () => {
    const res = middleware(makeReq('application/json'));
    expect(res.headers.get('X-Content-Type-Options')).toBeNull();
  });
});
