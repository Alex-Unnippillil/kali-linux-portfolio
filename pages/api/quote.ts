import type { NextApiRequest, NextApiResponse } from 'next';
import quotesData from '../../public/quotes/quotes.json';
import { generateStrongEtag, ifNoneMatchIncludes } from '../../utils/http/cache';

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
  const body = JSON.stringify(quote);
  const etag = generateStrongEtag(body);

  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.setHeader('ETag', etag);

  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatchIncludes(etag, ifNoneMatch)) {
    res.status(304).end();
    return;
  }

  res.status(200).json(quote);
}

