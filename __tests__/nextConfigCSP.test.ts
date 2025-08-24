// Simple CSP parser that throws on malformed directives
function parseCSP(csp: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};
  const parts = csp.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const tokens = trimmed.split(/\s+/);
    const [directive, ...values] = tokens;
    if (!directive || values.length === 0) {
      throw new Error(`Invalid directive: ${trimmed}`);
    }
    directives[directive] = values;
  }
  return directives;
}

describe('next.config.js Content Security Policy', () => {
  it('parses without errors and contains required hosts', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nextConfig = require('../next.config.js');
    const headersList: { headers: { key: string; value: string }[] }[] = await nextConfig.headers();
    const csp = headersList
      .flatMap((entry) => entry.headers)
      .find((h) => h.key === 'Content-Security-Policy');

    expect(csp).toBeDefined();
    const parsed = parseCSP(csp!.value);

    expect(parsed['connect-src']).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://cdn.syndication.twimg.com',
        'https://stackblitz.com',
      ])
    );
    expect(parsed['script-src']).toEqual(
      expect.arrayContaining([
        "'self'",
        "'unsafe-inline'",
        'https://platform.twitter.com',
      ])
    );
    expect(parsed['frame-src']).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://stackblitz.com',
        'https://www.youtube.com',
      ])
    );
  });
});
