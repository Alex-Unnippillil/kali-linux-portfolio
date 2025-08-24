import type { NextApiRequest, NextApiResponse } from 'next';
import pLimit from 'p-limit';
import sax from 'sax';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
}

interface RobotsResponse {
  disallows: string[];
  sitemapEntries: SitemapEntry[];
  errors?: string[];
  missingRobots?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RobotsResponse | { error: string }>
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url query parameter' });
    return;
  }

  const base = url.replace(/\/$/, '');
  let robotsText = '';
  try {
    const robotsRes = await fetch(`${base}/robots.txt`);
    if (!robotsRes.ok) {
      res
        .status(200)
        .json({ disallows: [], sitemapEntries: [], missingRobots: true });
      return;
    }
    robotsText = await robotsRes.text();
  } catch (e) {
    res
      .status(200)
      .json({ disallows: [], sitemapEntries: [], missingRobots: true });
    return;
  }

  const disallows: string[] = [];
  const sitemapUrls: string[] = [];
  robotsText.split(/\r?\n/).forEach((line) => {
    const cleaned = line.split('#')[0].trim();
    if (!cleaned) return;
    const [directive, value] = cleaned.split(':').map((s) => s.trim());
    if (/^disallow$/i.test(directive)) {
      disallows.push(value || '/');
    } else if (/^sitemap$/i.test(directive) && value) {
      sitemapUrls.push(value);
    }
  });

  const sitemapEntries: SitemapEntry[] = [];
  const errors: string[] = [];
  const limit = pLimit(3);

  const fetchSitemap = async (sitemapUrl: string): Promise<void> => {
    try {
      const sitemapRes = await fetch(sitemapUrl);
      if (!sitemapRes.ok) {
        if (sitemapRes.status === 401 || sitemapRes.status === 403) {
          errors.push(`Robots blocked: ${sitemapUrl}`);
        } else {
          errors.push(`Failed to fetch: ${sitemapUrl}`);
        }
        return;
      }
      if (!sitemapRes.body) {
        errors.push(`Empty sitemap: ${sitemapUrl}`);
        return;
      }

      const subSitemaps: string[] = [];
      let current: Partial<SitemapEntry> = {};
      let currentTag = '';

      const parser = sax.createStream(true, { trim: true });

      parser.on('opentag', (node) => {
        currentTag = node.name.toLowerCase();
      });

      parser.on('text', (text) => {
        if (currentTag === 'loc') current.loc = text.trim();
        else if (currentTag === 'lastmod') current.lastmod = text.trim();
        else if (currentTag === 'changefreq') current.changefreq = text.trim();
      });

      parser.on('closetag', (name) => {
        const tag = name.toLowerCase();
        if (tag === 'url') {
          if (current.loc)
            sitemapEntries.push(current as SitemapEntry);
          current = {};
        } else if (tag === 'sitemap') {
          if (current.loc) subSitemaps.push(current.loc);
          current = {};
        }
        currentTag = '';
      });

      parser.on('error', () => {
        errors.push(`Invalid XML: ${sitemapUrl}`);
        parser.resume();
      });

      const reader = sitemapRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.write(Buffer.from(value).toString());
      }
      parser.end();

      await Promise.all(
        subSitemaps.map((u) => limit(() => fetchSitemap(u)))
      );
    } catch (e) {
      errors.push(`Invalid XML: ${sitemapUrl}`);
    }
  };

  await Promise.all(sitemapUrls.map((u) => limit(() => fetchSitemap(u))));

  res.status(200).json({ disallows, sitemapEntries, errors });
}

