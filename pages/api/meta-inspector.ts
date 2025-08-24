import type { NextApiRequest, NextApiResponse } from 'next';
import { load } from 'cheerio';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing url parameter' });
  }

  let target: URL;
  try {
    target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid url' });
  }

  try {
    const response = await fetch(target.href, { method: 'GET' });
    const html = await response.text();
    const $ = load(html);

    const canonical = $('link[rel="canonical"]').attr('href') || null;
    const og: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      if (property && content) {
        og[property] = content;
      }
    });

    const twitter: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content) {
        twitter[name] = content;
      }
    });

    return res.status(200).json({ ok: true, data: { canonical, og, twitter } });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch url' });
  }
}

