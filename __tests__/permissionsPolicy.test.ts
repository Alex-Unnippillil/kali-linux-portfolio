import {
  middleware,
  DEFAULT_PERMISSIONS_POLICY,
  CAMERA_ENABLED_PERMISSIONS_POLICY,
} from '../middleware';

jest.mock('next/server', () => ({
  NextResponse: {
    next: () => {
      const store = new Map<string, string>();
      return {
        headers: {
          set: (key: string, value: string) => {
            store.set(key.toLowerCase(), value);
          },
          get: (key: string) => store.get(key.toLowerCase()) ?? null,
        },
      };
    },
  },
}));

const buildRequest = (pathname: string) =>
  ({ nextUrl: new URL(`https://example.com${pathname}`) } as unknown as import('next/server').NextRequest);

describe('Permissions-Policy middleware', () => {
  it('applies the default policy for non-exception routes', () => {
    const req = buildRequest('/');
    const res = middleware(req);
    expect(res.headers.get('Permissions-Policy')).toBe(DEFAULT_PERMISSIONS_POLICY);
  });

  it('enables camera access for the QR tool', () => {
    const req = buildRequest('/qr');
    const res = middleware(req);
    expect(res.headers.get('Permissions-Policy')).toBe(CAMERA_ENABLED_PERMISSIONS_POLICY);
  });

  it('enables camera access for QR sub-routes', () => {
    const req = buildRequest('/qr/live');
    const res = middleware(req);
    expect(res.headers.get('Permissions-Policy')).toBe(CAMERA_ENABLED_PERMISSIONS_POLICY);
  });
});
