import { ZodTypeAny } from 'zod';
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ValidationOptions {
  querySchema?: ZodTypeAny;
  bodySchema?: ZodTypeAny;
  queryLimit?: number;
  bodyLimit?: number;
}

export function validateRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  {
    querySchema,
    bodySchema,
    queryLimit = 1024,
    bodyLimit = 16 * 1024,
  }: ValidationOptions
) {
  const queryData = req.query ?? {};
  const queryString = JSON.stringify(queryData);
  if (queryString.length > queryLimit) {
    const hash = crypto
      .createHash('sha256')
      .update(queryString)
      .digest('hex');
    console.warn('Oversized query', hash);
    res.status(400).json({ error: 'Invalid input' });
    return null;
  }
  let parsedQuery = queryData;
  if (querySchema) {
    const result = querySchema.safeParse(queryData);
    if (!result.success) {
      const hash = crypto
        .createHash('sha256')
        .update(queryString)
        .digest('hex');
      console.warn('Invalid query', hash);
      res.status(400).json({ error: 'Invalid input' });
      return null;
    }
    parsedQuery = result.data;
  }

  const bodyData = req.body ?? {};
  const bodyString = JSON.stringify(bodyData);
  if (bodyString.length > bodyLimit) {
    const hash = crypto
      .createHash('sha256')
      .update(bodyString)
      .digest('hex');
    console.warn('Oversized body', hash);
    res.status(400).json({ error: 'Invalid input' });
    return null;
  }
  let parsedBody = bodyData;
  if (bodySchema) {
    const result = bodySchema.safeParse(bodyData);
    if (!result.success) {
      const hash = crypto
        .createHash('sha256')
        .update(bodyString)
        .digest('hex');
      console.warn('Invalid body', hash);
      res.status(400).json({ error: 'Invalid input' });
      return null;
    }
    parsedBody = result.data;
  }

  return { query: parsedQuery, body: parsedBody };
}
