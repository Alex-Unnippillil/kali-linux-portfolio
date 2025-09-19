const { ContentSecurityPolicy, securityHeaders } = require('../lib/securityHeaders.js');

describe('security headers baseline', () => {
  function getHeaderValue(key) {
    const entry = securityHeaders.find((header) => header.key === key);
    expect(entry).toBeDefined();
    return entry?.value;
  }

  it('includes the headers required for an A-grade security headers scan', () => {
    expect(getHeaderValue('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );
    expect(getHeaderValue('Content-Security-Policy')).toBe(ContentSecurityPolicy);
    expect(getHeaderValue('X-Content-Type-Options')).toBe('nosniff');
    expect(getHeaderValue('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(getHeaderValue('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=*');
    expect(getHeaderValue('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('keeps frame protections aligned between CSP and legacy headers', () => {
    expect(ContentSecurityPolicy).toContain("frame-ancestors 'self'");
    expect(ContentSecurityPolicy).toContain('upgrade-insecure-requests');
  });
});
