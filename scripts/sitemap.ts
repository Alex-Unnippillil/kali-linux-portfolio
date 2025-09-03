import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
const SITE_URL: string = (process.env.SITE_URL || pkg.homepage || '').replace(/\/$/, '');

const MAX_URLS_PER_SITEMAP = 50000;

interface UrlEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
}

async function collectPages(): Promise<UrlEntry[]> {
  const files = await fg(['pages/**/*.tsx', '!pages/**/[[]*[]].tsx', '!pages/**/_*.tsx', '!pages/**/api/**']);
  return files.map((file) => {
    const stats = fs.statSync(file);
    const route = file
      .replace(/^pages/, '')
      .replace(/index\.tsx$/, '')
      .replace(/\.tsx$/, '');
    const loc = `${SITE_URL}${route}`.replace(/\/+$/, '/');
    return {
      loc,
      lastmod: stats.mtime.toISOString(),
      changefreq: 'weekly',
    };
  });
}

function buildSitemap(urls: UrlEntry[]): string {
  const items = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function buildIndex(files: string[]): string {
  const items = files
    .map((file) => {
      const stats = fs.statSync(path.join('public', file));
      return `  <sitemap>\n    <loc>${SITE_URL}/${file}</loc>\n    <lastmod>${stats.mtime.toISOString()}</lastmod>\n  </sitemap>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

async function generate() {
  const urls = await collectPages();
  if (!fs.existsSync('public')) fs.mkdirSync('public');
  const chunks: UrlEntry[][] = [];
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_SITEMAP) {
    chunks.push(urls.slice(i, i + MAX_URLS_PER_SITEMAP));
  }
  const sitemapFiles: string[] = [];
  chunks.forEach((chunk, index) => {
    const filename = `sitemap-${index}.xml`;
    const xml = buildSitemap(chunk);
    fs.writeFileSync(path.join('public', filename), xml);
    sitemapFiles.push(filename);
  });
  // always generate index pointing to chunk files
  const indexXml = buildIndex(sitemapFiles);
  fs.writeFileSync(path.join('public', 'sitemap.xml'), indexXml);
}

generate();
