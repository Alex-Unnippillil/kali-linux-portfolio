import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
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
    parsedQuery = result.data as typeof queryData;
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
    parsedBody = result.data as typeof bodyData;
  }

  return { query: parsedQuery, body: parsedBody };
}

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.enum(['true', 'false']).optional(),
  NEXT_PUBLIC_TRACKING_ID: z.string().optional(),
});

const EnvSchema = z.object({});

function validate<T extends ZodTypeAny>(schema: T, env: NodeJS.ProcessEnv) {
  const result = schema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    if (env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing}`);
    }
    console.warn(`Missing required environment variables: ${missing}`);
    return {} as z.infer<T>;
  }
  return result.data as z.infer<T>;
}

export function validateEnv(env: NodeJS.ProcessEnv) {
  return validate(EnvSchema, env);
}

export function validatePublicEnv(env: NodeJS.ProcessEnv) {
  return validate(PublicEnvSchema, env);
}
