import { webcrypto } from 'node:crypto';

type HeaderMap = Map<string, string>;

const headers: HeaderMap = new Map();

const response = {
  headers: {
    set: jest.fn((key: string, value: string) => {
      headers.set(key, value);
    }),
    get: jest.fn((key: string) => headers.get(key) ?? null),
  },
};

globalThis.crypto = webcrypto as unknown as Crypto;

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => response),
  },
}));

// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const { middleware } = require('../middleware');

describe('middleware', () => {
  beforeEach(() => {
    headers.clear();
    jest.clearAllMocks();
  });

  it('sets security headers including Referrer-Policy', () => {
    const result = middleware({} as any);

    expect(result).toBe(response);
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(headers.get('x-csp-nonce')).toBeTruthy();
  });
});
