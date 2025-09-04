import type { NextApiRequest, NextApiResponse } from 'next';

interface Quote {
  content: string;
  author: string;
  tags?: string[];
}

// Simple in-memory cache keyed by tag
const cache: Record<string, { date: string; quote: Quote }> = {};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const tag = Array.isArray(req.query.tag) ? req.query.tag[0] : req.query.tag;
  const key = tag || '__default__';
  const today = new Date().toISOString().slice(0, 10);

  const cached = cache[key];
  if (cached && cached.date === today) {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    res.status(200).json(cached.quote);
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const url = tag
      ? `https://api.quotable.io/random?tags=${encodeURIComponent(tag)}`
      : 'https://api.quotable.io/random';
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) throw new Error('Failed to fetch quote');
    const data = await response.json();
    const quote: Quote = {
      content: data.content,
      author: data.author,
      tags: data.tags,
    };
    cache[key] = { date: today, quote };
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    res.status(200).json(quote);
  } catch (err) {
    clearTimeout(timer);
    res.status(503).json({ error: 'unavailable' });
  }
}

