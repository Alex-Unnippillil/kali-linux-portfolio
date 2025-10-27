import { buildOgImageUrl, resolveCanonicalUrl, sanitizeLocale, slugify } from '../../lib/og';

describe('OG helpers', () => {
  it('generates a fully-qualified OG image URL with defaults', () => {
    const url = buildOgImageUrl({ title: 'Example', subtitle: 'Details' });
    expect(url).toContain('/api/og');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('title')).toBe('Example');
    expect(parsed.searchParams.get('subtitle')).toBe('Details');
  });

  it('normalizes custom base URLs and slugs badges uniquely', () => {
    const url = buildOgImageUrl({
      baseUrl: 'portfolio.local',
      project: 'My Project',
      badges: ['One', 'Two', 'One'],
      locale: 'fr_CA',
      theme: 'light',
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://portfolio.local');
    expect(parsed.searchParams.get('project')).toBe('my-project');
    expect(parsed.searchParams.getAll('badge')).toEqual(['One', 'Two']);
    expect(parsed.searchParams.get('theme')).toBe('light');
    expect(parsed.searchParams.get('locale')).toBe('fr-ca');
  });

  it('sanitizes locales and falls back to default when invalid', () => {
    expect(sanitizeLocale('EN_us')).toBe('en-us');
    expect(sanitizeLocale('  ')).toBe('en');
    expect(sanitizeLocale('../../etc/passwd')).toBe('en');
  });

  it('creates deterministic slugs', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('  ')).toBe('');
  });

  it('resolves canonical URLs relative to the site origin', () => {
    expect(resolveCanonicalUrl('https://example.com', '/spoofing')).toBe('https://example.com/spoofing');
    expect(resolveCanonicalUrl(undefined, '')).toBe('https://unnippillil.com');
  });
});
