import type { NextApiRequest, NextApiResponse } from 'next';
import { XMLParser } from 'fast-xml-parser';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface UrlEntry {
  loc: string;
  lastmod?: string;
}

interface SitemapUrl {
  loc?: string;
  lastmod?: string;
}

interface HeatmapResponse {
  ok: boolean;
  urls: UrlEntry[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HeatmapResponse>
) {
  const { origin } = req.query;

  if (typeof origin !== 'string') {
    res.status(200).json({ ok: false, urls: [] });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    res.status(200).json({ ok: false, urls: [] });
    return;
  }

  try {
    const response = await fetch(`${parsed.origin}/sitemap.xml`);
    if (!response.ok) {
      res.status(200).json({ ok: false, urls: [] });
      return;
    }

    const xml = await response.text();
    const parser = new XMLParser();
    const data = parser.parse(xml);
    const urlset: SitemapUrl[] | SitemapUrl | undefined = data.urlset?.url;

    const urls: UrlEntry[] = [];
    if (Array.isArray(urlset)) {
      urlset.forEach((u: SitemapUrl) => {
        if (u.loc) urls.push({ loc: u.loc, lastmod: u.lastmod });
      });
    } else if (urlset && urlset.loc) {
      urls.push({ loc: urlset.loc, lastmod: urlset.lastmod });
    }

    res.status(200).json({ ok: true, urls });
  } catch {
    res.status(200).json({ ok: false, urls: [] });
  }
}

