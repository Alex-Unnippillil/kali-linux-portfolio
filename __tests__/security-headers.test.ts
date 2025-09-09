/** @jest-environment node */

describe('security headers', () => {
  it('disables camera, microphone, geolocation and sets referrer policy', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const config = require('../next.config.js');
    const headersList = await config.headers();
    const headerMap = Object.fromEntries(headersList.find((h: any) => h.source === '/(.*)').headers.map((h: any) => [h.key, h.value]));
    expect(headerMap['Permissions-Policy']).toBe(
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );
    expect(headerMap['Referrer-Policy']).toBe(
      'strict-origin-when-cross-origin'
    );
  });
});
