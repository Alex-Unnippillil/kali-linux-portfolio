#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

const DEFAULT_SITE_URL = 'https://unnippillil.com';
const PAGE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'];

const pagesDir = path.join(process.cwd(), 'pages');
const publicDir = path.join(process.cwd(), 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const robotsPath = path.join(publicDir, 'robots.txt');

function normalizeBasePath(rawValue) {
  if (!rawValue) return '/';
  const trimmed = rawValue.trim();
  if (!trimmed) return '/';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const sanitized = withLeadingSlash.replace(/\/{2,}/g, '/');
  if (sanitized === '/' || sanitized === '') {
    return '/';
  }
  return sanitized.endsWith('/') ? sanitized.slice(0, -1) : sanitized;
}

function resolveSiteUrl(rawValue) {
  const fallback = DEFAULT_SITE_URL;
  if (!rawValue) return fallback;
  const trimmed = rawValue.trim();
  if (!trimmed) return fallback;
  const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed.replace(/^\/+|\/+$/g, '')}`;
  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return fallback;
  }
}

function normalizeRoutePath(rawPath) {
  if (!rawPath) return '/';
  const trimmed = rawPath.trim();
  if (!trimmed) return '/';
  const withLeading = (trimmed.startsWith('/') ? trimmed : `/${trimmed}`).replace(/\/{2,}/g, '/');
  if (withLeading === '/' || withLeading === '') {
    return '/';
  }
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
}

function removeBasePath(pathname, basePath) {
  const normalizedBase = basePath ?? '/';
  const normalizedPath = normalizeRoutePath(pathname);
  if (normalizedBase !== '/' && normalizedPath.startsWith(normalizedBase)) {
    const remainder = normalizedPath.slice(normalizedBase.length) || '/';
    return normalizeRoutePath(remainder);
  }
  return normalizedPath;
}

function joinBasePath(basePath, routePath) {
  const base = basePath === '/' ? '' : basePath;
  if (routePath === '/' || routePath === '') {
    return base || '/';
  }
  const joined = `${base}${routePath}`.replace(/\/{2,}/g, '/');
  return joined.endsWith('/') && joined !== '/' ? joined.slice(0, -1) : joined;
}

function buildCanonicalUrl(siteUrl, basePath, routePath) {
  const normalizedRoute = normalizeRoutePath(routePath);
  const fullPath = joinBasePath(basePath, normalizedRoute);
  return `${siteUrl}${fullPath === '/' ? '/' : fullPath}`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resolveEnvironment() {
  const basePath = normalizeBasePath(
    process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? ''
  );
  const siteUrl = resolveSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.SITE_URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      DEFAULT_SITE_URL
  );
  return { basePath, siteUrl };
}

function fileToRoute(filePath) {
  let withoutExt = filePath.replace(/\\/g, '/');
  for (const ext of PAGE_EXTENSIONS) {
    if (withoutExt.toLowerCase().endsWith(`.${ext}`)) {
      withoutExt = withoutExt.slice(0, -1 * (ext.length + 1));
      break;
    }
  }
  if (!withoutExt) return null;
  if (withoutExt === 'index') return '/';
  if (withoutExt.endsWith('/index')) {
    withoutExt = withoutExt.slice(0, -6);
  }
  if (!withoutExt) return '/';
  if (withoutExt.startsWith('_')) return null;
  const segments = withoutExt.split('/');
  if (segments.some((segment) => segment.startsWith('_'))) {
    return null;
  }
  if (segments.some((segment) => segment.startsWith('['))) {
    // Skip dynamic routes; they are handled separately or not indexed.
    return null;
  }
  return normalizeRoutePath(`/${withoutExt}`);
}

async function collectRoutes() {
  const patterns = [`**/*.{${PAGE_EXTENSIONS.join(',')}}`];
  const ignore = [
    'api/**',
    '_app.*',
    '_document.*',
    '_error.*',
    '404.*',
    '500.*',
    '**/_middleware.*',
    '**/_app.*',
    '**/_document.*',
    '**/_error.*',
    '**/\[**',
  ];
  const files = await fg(patterns, { cwd: pagesDir, ignore, onlyFiles: true });
  const routes = new Map();

  for (const file of files) {
    const route = fileToRoute(file);
    if (!route) continue;
    const absolute = path.join(pagesDir, file);
    try {
      const stats = await fs.stat(absolute);
      routes.set(route, stats.mtime.toISOString());
    } catch {
      routes.set(route, new Date().toISOString());
    }
  }

  return [...routes.entries()].sort(([a], [b]) => a.localeCompare(b));
}

async function writeSitemap(routes, siteUrl, basePath) {
  const urls = routes
    .map(([route, lastmod]) => {
      const loc = escapeXml(buildCanonicalUrl(siteUrl, basePath, route));
      const changefreq = route === '/' ? 'monthly' : 'weekly';
      const priority = route === '/' ? '1.0' : '0.7';
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');

  await fs.writeFile(sitemapPath, xml, 'utf8');
  console.log(`Generated sitemap with ${routes.length} routes at ${path.relative(process.cwd(), sitemapPath)}`);
}

async function writeRobots(siteUrl, basePath) {
  const sitemapLocation = buildCanonicalUrl(siteUrl, basePath, '/sitemap.xml');
  const lines = [
    '# https://www.robotstxt.org/robotstxt.html',
    'User-agent: *',
    'Disallow:',
    '',
    `Sitemap: ${sitemapLocation}`,
    '',
  ];
  await fs.writeFile(robotsPath, lines.join('\n'), 'utf8');
  console.log(`Updated robots.txt at ${path.relative(process.cwd(), robotsPath)}`);
}

async function main() {
  const { basePath, siteUrl } = resolveEnvironment();
  const routes = await collectRoutes();
  if (routes.length === 0) {
    throw new Error('No routes found to include in sitemap.');
  }
  await writeSitemap(routes, siteUrl, basePath);
  await writeRobots(siteUrl, basePath);
}

main().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exitCode = 1;
});
