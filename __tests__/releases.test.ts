import { parseReleases } from '../lib/releases';

describe('parseReleases', () => {
  it('parses version and tags from changelog', () => {
    const releases = parseReleases();
    expect(releases[0].version).toBe('2.1.0');
    expect(releases[0].tags).toContain('Added');
  });
});
