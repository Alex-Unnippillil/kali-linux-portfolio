import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate';
import {
  UserInputError,
  withErrorHandler,
} from '../../lib/errors';
import { fetchRobots } from '../../lib/robots';
import { XMLParser } from 'fast-xml-parser';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  depth: number;
  status?: number;
}

interface RobotsResponse {
  disallows: string[];
  sitemapEntries: SitemapEntry[];
  missingRobots?: boolean;
  robotsUrl: string;
}

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
};

const querySchema = z.object({ url: z.string().url() });
const bodySchema = z.object({});

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RobotsResponse>
) {
  const parsed = validateRequest(req, res, {
    querySchema,
    bodySchema,
    queryLimit: 1024,
    bodyLimit: 1024,
  });
  if (!parsed) return;
  const { url } = parsed.query as { url: string };

  if (!url || typeof url !== 'string') {
    throw new UserInputError('Missing url query parameter');
  }

  const originUrl = new URL(url);
  const origin = originUrl.origin;
  const robotsUrl = `${origin}/robots.txt`;

  const robotsData = await fetchRobots(origin);

  const disallows = robotsData.groups.flatMap((g) => g.disallows);
  const sitemapUrls = robotsData.sitemaps.length
    ? robotsData.sitemaps
    : [`${origin}/sitemap.xml`];

  const parser = new XMLParser({ ignoreAttributes: false });
  const visited = new Set<string>();

  async function crawlSitemap(sitemapUrl: string): Promise<SitemapEntry[]> {
    if (visited.has(sitemapUrl)) return [];
    visited.add(sitemapUrl);
    try {
      const res = await fetch(sitemapUrl);
      if (!res.ok) return [];
      const text = await res.text();
      const xml = parser.parse(text);
      if (xml.urlset) {
        const urls = Array.isArray(xml.urlset.url)
          ? xml.urlset.url
          : [xml.urlset.url];
        const entries: SitemapEntry[] = [];
        for (const u of urls) {
          const loc: string = u.loc;
          const lastmod: string | undefined = u.lastmod;
          let status: number | undefined;
          try {
            const head = await fetch(loc, { method: 'HEAD' });
            status = head.status;
          } catch {
            status = undefined;
          }
          const depth = new URL(loc).pathname.split('/').filter(Boolean)
            .length;
          entries.push({ loc, lastmod, status, depth });
        }
        return entries;
      } else if (xml.sitemapindex) {
        const maps = Array.isArray(xml.sitemapindex.sitemap)
          ? xml.sitemapindex.sitemap
          : [xml.sitemapindex.sitemap];
        let all: SitemapEntry[] = [];
        for (const m of maps) {
          const loc: string = m.loc;
          const sub = await crawlSitemap(loc);
          all = all.concat(sub);
        }
        return all;
      }
    } catch {
      return [];
    }
    return [];
  }

  let sitemapEntries: SitemapEntry[] = [];
  for (const sm of sitemapUrls) {
    const entries = await crawlSitemap(sm);
    sitemapEntries = sitemapEntries.concat(entries);
  }

  res.status(200).json({
    disallows,
    sitemapEntries,
    missingRobots: robotsData.missing,
    robotsUrl,
  });
});

