import fs from 'fs';
import { parseSitemap } from '../lib/sitemap';
import { parseRobots } from '../lib/robots';

test('robots.txt references sitemap', () => {
  const text = fs.readFileSync('public/robots.txt', 'utf8');
  const data = parseRobots(text);
  expect(data.sitemaps).toContain('https://unnippillil.com/sitemap.xml');
});

test('sitemap.xml contains home page URL', async () => {
  const stream = fs.createReadStream('public/sitemap.xml');
  const entries = await parseSitemap(stream);
  const urls = entries.map((e) => e.loc);
  expect(urls).toContain('https://unnippillil.com/');
});

