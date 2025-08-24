import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate-server';
import { UserInputError, withErrorHandler } from '../../lib/errors';
import { fetchRobots, RobotsData } from '../../lib/robots';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

import { XMLParser } from 'fast-xml-parser';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  depth: number;
  status?: number;
  priority?: number;
  types?: string[];
  freshness?: number;
  searchConsole?: string;
}

interface RuleInfo {
  rule: string;
  type: 'allow' | 'disallow';
  overriddenBy?: string;
}

interface RobotsResponse {
  sitemaps: string[];
  sitemapEntries: SitemapEntry[];
  unsupported: string[];
  profiles: Record<string, RuleInfo[]>;
  missingRobots?: boolean;
  robotsUrl: string;
  errorCategories: Record<string, number>;
}

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
};

const querySchema = z.object({ url: z.string().url() });
const bodySchema = z.object({});

function buildProfile(data: RobotsData, ua: string): RuleInfo[] {
  const rules: RuleInfo[] = [];
  data.groups.forEach((g) => {
    if (g.userAgents.includes(ua) || g.userAgents.includes('*')) {
      g.allows.forEach((r) => rules.push({ rule: r, type: 'allow' }));
      g.disallows.forEach((r) => rules.push({ rule: r, type: 'disallow' }));
    }
  });
  // determine precedence
  for (const a of rules) {
    for (const b of rules) {
      if (a === b || a.type === b.type) continue;
      const allow = a.type === 'allow' ? a : b;
      const disallow = a.type === 'disallow' ? a : b;
      if (disallow.rule.startsWith(allow.rule)) {
        if (allow.rule.length >= disallow.rule.length) {
          disallow.overriddenBy = allow.rule;
        } else {
          allow.overriddenBy = disallow.rule;
        }
      }
    }
  }
  return rules;
}

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

  const origin = new URL(url).origin;
  const robots = await fetchRobots(origin);

  const parser = new XMLParser({ ignoreAttributes: false });

  async function parseSitemap(url: string): Promise<SitemapEntry[]> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const xml = await resp.text();
      const data = parser.parse(xml);
      const entries: SitemapEntry[] = [];

      const sitemapIndex = data.sitemapindex?.sitemap;
      if (sitemapIndex) {
        const children = Array.isArray(sitemapIndex) ? sitemapIndex : [sitemapIndex];
        for (const child of children) {
          if (child.loc) {
            const childEntries = await parseSitemap(child.loc);
            entries.push(...childEntries);
          }
        }
        return entries;
      }

      const urlset = data.urlset?.url;
      const urls = Array.isArray(urlset) ? urlset : urlset ? [urlset] : [];
      for (const u of urls) {
        if (!u.loc) continue;
        const depth = new URL(u.loc).pathname.split('/').filter(Boolean).length;
        const entry: SitemapEntry = {
          loc: u.loc,
          lastmod: u.lastmod,
          depth,
        };
        if (u.priority) entry.priority = parseFloat(u.priority);
        const types: string[] = [];
        if (u['news:news'] || u.news) types.push('news');
        if (u['image:image'] || u.image) types.push('image');
        if (u['video:video'] || u.video) types.push('video');
        if (types.length) entry.types = types;
        try {
          const head = await fetch(u.loc, { method: 'HEAD' });
          entry.status = head.status;
        } catch {
          // ignore
        }
        if (entry.lastmod) {
          entry.freshness = Math.floor(
            (Date.now() - new Date(entry.lastmod).getTime()) / (1000 * 60 * 60 * 24)
          );
        }
        entry.searchConsole =
          'https://search.google.com/search-console/inspect?url=' +
          encodeURIComponent(entry.loc);
        entries.push(entry);
      }
      return entries;
    } catch {
      return [];
    }
  }

  const sitemapEntries: SitemapEntry[] = [];
  for (const sm of robots.sitemaps) {
    const entries = await parseSitemap(sm);
    sitemapEntries.push(...entries);
  }

  const errorCategories: Record<string, number> = {};
  sitemapEntries.forEach((e) => {
    if (e.status && e.status >= 400) {
      const key = e.status.toString();
      errorCategories[key] = (errorCategories[key] || 0) + 1;
    }
  });

  const crawlers = ['googlebot', 'bingbot', 'duckduckbot', 'yandexbot'];
  const profiles: Record<string, RuleInfo[]> = {};
  crawlers.forEach((ua) => {
    profiles[ua] = buildProfile(robots, ua);
  });

  res.status(200).json({
    sitemaps: robots.sitemaps,
    sitemapEntries,
    unsupported: robots.unsupported,
    profiles,
    missingRobots: robots.missing || undefined,
    robotsUrl: `${origin.replace(/\/$/, '')}/robots.txt`,
    errorCategories,
  });
});

