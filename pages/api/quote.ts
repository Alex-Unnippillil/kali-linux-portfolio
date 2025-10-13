import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import quotesData from '../../public/quotes/quotes.json';

export const QuoteSchema = z.object({
  content: z.string(),
  author: z.string(),
  tags: z.array(z.string()).optional(),
});

export const QuoteErrorSchema = z.object({
  error: z.string(),
  tag: z.string().optional(),
});

export const QuoteQuerySchema = z.object({
  tag: z.union([z.string(), z.array(z.string())]).optional(),
});

export const QuoteResponseSchema = z.union([QuoteSchema, QuoteErrorSchema]);

const quotes = QuoteSchema.array().parse(quotesData);

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const query = QuoteQuerySchema.parse(req.query);
  const tag = Array.isArray(query.tag) ? query.tag[0] : query.tag;
  const pool = tag ? quotes.filter((q) => q.tags?.includes(tag)) : quotes;

  if (pool.length === 0) {
    const errorBody = QuoteErrorSchema.parse({
      error: 'No quotes found for the provided tag.',
      tag,
    });

    res.status(404).json(errorBody);
    return;
  }

  const index = Math.floor(Math.random() * pool.length);
  const quote = QuoteSchema.parse(pool[index]);

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=86400, stale-while-revalidate=3600',
  );
  res.status(200).json(quote);
}

