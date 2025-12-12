const { baseDirectives, buildCsp } = require('../lib/csp/sources');

describe('CSP configuration', () => {
  test('img-src allowlist covers remote assets and excludes placeholders', () => {
    const imgSrc: string[] = baseDirectives['img-src'];
    expect(imgSrc).toEqual(
      expect.arrayContaining([
        "'self'",
        'data:',
        'https://ghchart.rshah.org',
        'https://img.shields.io',
        'https://images.credly.com',
        'https://data.typeracer.com',
        'https://icons.duckduckgo.com',
        'https://i.ytimg.com',
        'https://staticmap.openstreetmap.de',
      ]),
    );
    expect(imgSrc).not.toContain('https://example.com');
  });

  test('connect-src allows required APIs without stale domains', () => {
    const connectSrc: string[] = baseDirectives['connect-src'];
    expect(connectSrc).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://stackblitz.com',
        'https://vscode.dev',
        'https://api.github.com',
        'https://github-contributions-api.jogruber.de',
        'https://api.open-meteo.com',
        'https://geocoding-api.open-meteo.com',
        'https://api.openweathermap.org',
        'https://api.exchangerate.host',
        'https://jsonplaceholder.typicode.com',
        'https://ifconfig.me',
        'https://speed.cloudflare.com',
        'https://www.googleapis.com',
        'https://www.youtube.com',
        'https://ipapi.co',
        'https://unpkg.com',
      ]),
    );
    expect(connectSrc).not.toContain('https://example.com');
    expect(connectSrc).not.toContain('https://developer.mozilla.org');
    expect(connectSrc).not.toContain('https://en.wikipedia.org');
  });

  test('frame-src favors privacy-friendly media providers', () => {
    const frameSrc: string[] = baseDirectives['frame-src'];
    expect(frameSrc).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://open.spotify.com',
        'https://www.youtube-nocookie.com',
        'https://react.dev',
      ]),
    );
    expect(frameSrc).not.toContain('https://www.youtube.com');
    expect(frameSrc).not.toContain('https://example.com');
  });

  test('buildCsp injects nonces and unsafe-eval only when requested', () => {
    const withNonce = buildCsp({ nonce: 'abc123', allowUnsafeEval: true });
    expect(withNonce).toMatch(/script-src[^;]*'nonce-abc123'/);
    expect(withNonce).toMatch(/script-src[^;]*'unsafe-eval'/);

    const withoutEval = buildCsp({ nonce: 'xyz' });
    expect(withoutEval).toMatch(/script-src[^;]*'nonce-xyz'/);
    expect(withoutEval).not.toMatch(/'unsafe-eval'/);
    expect(withoutEval).toMatch(/upgrade-insecure-requests/);
  });
});
