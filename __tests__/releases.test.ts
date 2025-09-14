import { getReleases } from '../lib/releases';

describe('getReleases', () => {
  it('parses LTS and EOL front matter', () => {
    const releases = getReleases();
    const current = releases.find((r) => r.version === '2024.1');
    expect(current).toBeDefined();
    expect(current?.lts).toBe(true);
    expect(current?.eol).toBe('2026-01-01');
  });
});
