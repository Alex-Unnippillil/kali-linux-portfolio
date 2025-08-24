import fs from 'fs';
import { parseSitemap } from '../lib/sitemap';

test('parse large sitemap', async () => {
  const stream = fs.createReadStream(__dirname + '/fixtures/big-sitemap.xml');
  const urls = await parseSitemap(stream);
  expect(urls.length).toBe(1000);
  expect(urls[0]).toEqual({
    loc: 'https://example.com/page0.html',
    priority: 0.0,
    changefreq: 'daily',
  });
});
