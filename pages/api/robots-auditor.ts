import type { NextApiRequest, NextApiResponse } from 'next';
import { XMLParser } from 'fast-xml-parser';

interface RobotsAuditorResponse {
  disallows: string[];
  urls: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RobotsAuditorResponse | { error: string }>
) {
  const { origin } = req.query;
  if (!origin || typeof origin !== 'string') {
    res.status(400).json({ error: 'Missing origin query parameter' });
    return;
  }

  const base = origin.replace(/\/$/, '');
  const disallows: string[] = [];
  const urls: string[] = [];

  try {
    const robotsRes = await fetch(`${base}/robots.txt`);
    if (robotsRes.ok) {
      const text = await robotsRes.text();
      text.split(/\r?\n/).forEach((line) => {
        const cleaned = line.split('#')[0].trim();
        if (!cleaned) return;
        const [directive, value] = cleaned.split(':').map((s) => s.trim());
        if (/^disallow$/i.test(directive)) {
          disallows.push(value || '/');
        }
      });
    }
  } catch (e) {
    // ignore robots.txt errors
  }

  try {
    const sitemapRes = await fetch(`${base}/sitemap.xml`);
    if (sitemapRes.ok) {
      const xml = await sitemapRes.text();
      const parser = new XMLParser();
      const parsed = parser.parse(xml);
      const collectLocs = (node: any) => {
        if (!node || typeof node !== 'object') return;
        for (const key of Object.keys(node)) {
          const value = (node as any)[key];
          if (key.toLowerCase() === 'loc' && typeof value === 'string') {
            urls.push(value);
          } else if (typeof value === 'object') {
            collectLocs(value);
          }
        }
      };
      collectLocs(parsed);
    }
  } catch (e) {
    // ignore sitemap errors
  }

  res.status(200).json({ disallows, urls });
}
