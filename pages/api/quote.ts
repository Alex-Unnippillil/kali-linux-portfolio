import type { NextApiRequest, NextApiResponse } from 'next';
import { filterByTag, getAllQuotes } from '../../quotes/localQuotes';

const quotes = getAllQuotes();

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const tag = Array.isArray(req.query.tag) ? req.query.tag[0] : req.query.tag;
  const pool = tag ? filterByTag(quotes, tag) : quotes;

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

