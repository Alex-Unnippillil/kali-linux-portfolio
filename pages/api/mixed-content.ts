import type { NextApiRequest, NextApiResponse } from 'next';
import { load } from 'cheerio';
import URLParse from 'url-parse';

interface ApiResponse {
  ok: boolean;
  items: Record<string, string[]>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | { error: string }>
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`;
  }

  let pageUrl: any;
  try {
    pageUrl = new URLParse(target);
  } catch (e) {
    res.status(400).json({ error: 'Invalid url' });
    return;
  }

  try {
    const response = await fetch(pageUrl.href);
    const html = await response.text();
    const $ = load(html);

    const items: Record<string, string[]> = {};

    if (pageUrl.protocol === 'https:') {
      $('script[src], img[src], link[href], iframe[src], audio[src], video[src], source[src]').each((_, el) => {
        const tag = (el.tagName || (el as any).name || '').toLowerCase();
        const attr = tag === 'link' ? 'href' : 'src';
        const val = $(el).attr(attr);
        if (!val) return;
        const parsed = new URLParse(val, pageUrl.href);
        if (parsed.protocol === 'http:') {
          if (!items[tag]) items[tag] = [];
          items[tag].push(parsed.href);
        }
      });
    }

    res.status(200).json({ ok: Object.keys(items).length === 0, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch url' });
  }
}
