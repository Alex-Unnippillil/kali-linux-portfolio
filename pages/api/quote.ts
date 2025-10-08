import type { NextApiRequest, NextApiResponse } from 'next';
import quotesData from '../../public/quotes/quotes.json';

interface Quote {
  content: string;
  author: string;
  tags?: string[];
}

const quotes = quotesData as Quote[];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const tag = Array.isArray(req.query.tag) ? req.query.tag[0] : req.query.tag;
  const pool = tag ? quotes.filter((q) => q.tags?.includes(tag)) : quotes;

  if (pool.length === 0) {
    res
      .status(404)
      .json({
        error: 'No quotes found for the provided tag.',
        tag,
      });
    return;
  }

  const index = Math.floor(Math.random() * pool.length);
  const quote = pool[index];

  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.status(200).json(quote);
}

