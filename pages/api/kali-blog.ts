import type { NextApiRequest, NextApiResponse } from 'next';
import { XMLParser } from 'fast-xml-parser';

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

const RSS_URL = 'https://www.kali.org/rss.xml';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

let cache: BlogPost[] | null = null;
let lastFetch = 0;

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!cache || Date.now() - lastFetch > CACHE_TTL) {
    try {
      const response = await fetch(RSS_URL);
      const xml = await response.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      const data = parser.parse(xml);
      const items: any[] = data.rss.channel.item || [];
      cache = items.map((item) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description: item.description,
      }));
      lastFetch = Date.now();
    } catch (err) {
      console.error('Failed to fetch RSS feed', err);
      if (!cache) {
        res.status(500).json({ error: 'Failed to load feed' });
        return;
      }
    }
  }

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=1800',
  );
  res.status(200).json(cache);
}

