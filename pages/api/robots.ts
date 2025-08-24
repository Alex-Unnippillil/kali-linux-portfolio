import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate';
import { UserInputError, withErrorHandler } from '../../lib/errors';
import { fetchRobots, RobotsData } from '../../lib/robots';

import { XMLParser } from 'fast-xml-parser';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  depth: number;
  status?: number;
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

  const sitemapEntries: SitemapEntry[] = [];
  const parser = new XMLParser();
  for (const sm of robots.sitemaps) {
    try {
      const resp = await fetch(sm);
      if (!resp.ok) continue;
      const xml = await resp.text();
      const data = parser.parse(xml);
      const urlset = data.urlset?.url;
      if (Array.isArray(urlset)) {
        urlset.forEach((u: any) => {
          if (u.loc) sitemapEntries.push({ loc: u.loc, lastmod: u.lastmod });
        });
      } else if (urlset?.loc) {
        sitemapEntries.push({ loc: urlset.loc, lastmod: urlset.lastmod });
      }
    } catch {
      // ignore errors fetching individual sitemaps
    }
  }

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

  });
});

