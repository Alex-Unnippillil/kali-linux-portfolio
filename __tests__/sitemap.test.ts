import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

describe('generated sitemap', () => {
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const robotsTxt = fs.readFileSync(robotsPath, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(sitemapXml);
  const entries = Array.isArray(parsed.urlset.url)
    ? parsed.urlset.url
    : [parsed.urlset.url];
  const locs = entries.map((entry) => entry.loc);

  it('includes key application routes', () => {
    expect(locs).toEqual(
      expect.arrayContaining([
        'https://unnippillil.com/',
        'https://unnippillil.com/apps',
        'https://unnippillil.com/apps/2048',
      ])
    );
  });

  it('uses secure absolute URLs and avoids duplicates', () => {
    const unique = new Set(locs);
    expect(unique.size).toBe(locs.length);
    expect(locs.every((loc) => loc.startsWith('https://unnippillil.com'))).toBe(true);
  });

  it('marks the homepage as the highest priority entry', () => {
    const home = entries.find((entry) => entry.loc === 'https://unnippillil.com/');
    expect(home).toBeDefined();
    expect(Number(home?.priority)).toBeCloseTo(1);
    expect(home?.changefreq).toBe('monthly');
  });

  it('exports the sitemap location in robots.txt', () => {
    expect(robotsTxt).toContain('Sitemap: https://unnippillil.com/sitemap.xml');
    expect(robotsTxt).toContain('User-agent: *');
    expect(robotsTxt).toContain('Disallow:');
  });
});
