import type { NextApiRequest, NextApiResponse } from 'next';
import quotesData from '../../public/quotes/quotes.json';
import {
  createRateLimiter,
  getRequestIp,
  setRateLimitHeaders,
} from '../../utils/rateLimiter';

interface Quote {
  content: string;
  author: string;
  tags?: string[];
}

const quotes = quotesData as Quote[];
const limiter = createRateLimiter();

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const rate = limiter.check(getRequestIp(req));
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    res.status(429).json({ error: 'rate_limit_exceeded' });
    return;
  }

  const tag = Array.isArray(req.query.tag) ? req.query.tag[0] : req.query.tag;
  const pool = tag ? quotes.filter((q) => q.tags?.includes(tag)) : quotes;
  const quote = pool[Math.floor(Math.random() * pool.length)];
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.status(200).json(quote);
}

