import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';

interface CachedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

const cache = new LRUCache<string, CachedResponse>({
  max: 100,
  ttl: 60 * 1000, // 1 minute
  allowStale: true,
});

const inflight = new Map<string, Promise<CachedResponse>>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10;
const rateLimit = new Map<string, { count: number; reset: number }>();

function cacheKey(method: string, url: string, headers: any, body: any) {
  return `${method}:${url}:${JSON.stringify(headers)}:${body ?? ''}`;
}

function checkRateLimit(ip: string): number | null {
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record || now > record.reset) {
    rateLimit.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return null;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return record.reset - now;
  }
  record.count += 1;
  return null;
}

async function fetchAndCache(
  key: string,
  url: string,
  options: RequestInit
): Promise<CachedResponse> {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    const data: CachedResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: headersObj,
      body: text,
    };
    cache.set(key, data);
    return data;
  } finally {
    inflight.delete(key);
  }
}

async function cachedFetch(
  key: string,
  url: string,
  options: RequestInit
): Promise<CachedResponse> {
  const cached = cache.get(key, { allowStale: true });
  if (cached && !cache.isStale(key)) {
    return cached;
  }
  if (cached && cache.isStale(key)) {
    if (!inflight.has(key)) {
      inflight.set(key, fetchAndCache(key, url, options));
    }
    return cached;
  }
  if (inflight.has(key)) {
    return inflight.get(key)!;
  }
  const promise = fetchAndCache(key, url, options);
  inflight.set(key, promise);
  return promise;
}

export default async function handler(

import {
  UserInputError,
  UpstreamError,
  withErrorHandler,
  fail,
} from '../../lib/errors';

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    fail(res, 405, 'method_not_allowed', 'Method not allowed');
    return;
  }

  const { method = 'GET', url, headers = {}, body } = req.body || {};

  if (!url || typeof url !== 'string') {
    throw new UserInputError('Missing url');
  }

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  const retry = checkRateLimit(ip);
  if (retry !== null) {
    res.setHeader('Retry-After', Math.ceil(retry / 1000).toString());
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const key = cacheKey(method, url, headers, body);
  const start = Date.now();

  try {
    const data = await cachedFetch(key, url, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : body,
    });
    const duration = Date.now() - start;
    return res.status(200).json({ duration, ...data });
  } catch (error: any) {
    const duration = Date.now() - start;
    return res.status(500).json({
      error: error?.message || 'Request failed',
      duration,
    });

  const response = await fetch(url, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : body,
  });

  const text = await response.text();
  const headersObj: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  if (!response.ok) {
    throw new UpstreamError(response.statusText || 'Request failed');
  }

  return res.status(200).json({
    status: response.status,
    statusText: response.statusText,
    headers: headersObj,
    body: text,
  });
});
