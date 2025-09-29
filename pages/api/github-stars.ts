import type { NextApiRequest, NextApiResponse } from 'next';

interface CacheEntry {
  etag: string;
  stars: number;
  fetchedAt: number;
  expiresAt: number;
}

interface StarPayload {
  user: string;
  repo: string;
  stars: number;
  fetchedAt: string;
  fromCache: boolean;
  stale: boolean;
  rateLimited: boolean;
}

type CacheStore = Map<string, CacheEntry>;

const FIVE_MINUTES = 5 * 60 * 1000;
const USER_AGENT = 'kali-linux-portfolio (https://unnippillil.com)';

declare global {
  var __githubStarCache: CacheStore | undefined;
}

const globalCache = globalThis as typeof globalThis & { __githubStarCache?: CacheStore };
const cache: CacheStore = globalCache.__githubStarCache ?? new Map();
if (!globalCache.__githubStarCache) {
  globalCache.__githubStarCache = cache;
}

const fallbackEtag = (key: string, stars: number, fetchedAt: number) => {
  return `W/"${key}:${stars}:${fetchedAt}"`;
};

const toPayload = (
  key: string,
  entry: CacheEntry,
  options: { fromCache: boolean; stale?: boolean; rateLimited?: boolean },
  user: string,
  repo: string,
): StarPayload => ({
  user,
  repo,
  stars: entry.stars,
  fetchedAt: new Date(entry.fetchedAt).toISOString(),
  fromCache: options.fromCache,
  stale: options.stale ?? false,
  rateLimited: options.rateLimited ?? false,
});

const getClientEtag = (req: NextApiRequest): string | null => {
  const header = req.headers['if-none-match'];
  if (!header) return null;
  if (Array.isArray(header)) return header[0] ?? null;
  return header;
};

const getToken = () => {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_API_TOKEN;
  return token?.trim() ? token.trim() : null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const userParam = req.query.user;
  const repoParam = req.query.repo;

  if (!userParam || !repoParam || Array.isArray(userParam) || Array.isArray(repoParam)) {
    res.status(400).json({ error: 'Missing repository identifier' });
    return;
  }

  const user = userParam.trim();
  const repo = repoParam.trim();
  const key = `${user}/${repo}`;
  const now = Date.now();
  const clientEtag = getClientEtag(req);

  const cachedEntry = cache.get(key);

  if (cachedEntry && cachedEntry.expiresAt > now) {
    const etagToSend = cachedEntry.etag ?? fallbackEtag(key, cachedEntry.stars, cachedEntry.fetchedAt);
    res.setHeader('ETag', etagToSend);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('Vary', 'If-None-Match');
    if (clientEtag && clientEtag === etagToSend) {
      res.status(304).end();
      return;
    }
    const payload = toPayload(key, cachedEntry, { fromCache: true }, user, repo);
    res.status(200).json(payload);
    return;
  }

  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (cachedEntry?.etag) {
    headers['If-None-Match'] = cachedEntry.etag;
  }

  try {
    const ghResponse = await fetch(`https://api.github.com/repos/${user}/${repo}`, {
      headers,
    });

    const rateLimited = ghResponse.status === 403 || ghResponse.status === 429;

    if (ghResponse.status === 304 && cachedEntry) {
      const updatedEntry: CacheEntry = {
        ...cachedEntry,
        expiresAt: now + FIVE_MINUTES,
      };
      cache.set(key, updatedEntry);
      const etagToSend = updatedEntry.etag ?? fallbackEtag(key, updatedEntry.stars, updatedEntry.fetchedAt);
      res.setHeader('ETag', etagToSend);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('Vary', 'If-None-Match');
      if (clientEtag && clientEtag === etagToSend) {
        res.status(304).end();
        return;
      }
      const payload = toPayload(key, updatedEntry, { fromCache: true }, user, repo);
      res.status(200).json(payload);
      return;
    }

    if (!ghResponse.ok) {
      if (rateLimited && cachedEntry) {
        const staleEntry: CacheEntry = {
          ...cachedEntry,
          expiresAt: now + FIVE_MINUTES,
        };
        cache.set(key, staleEntry);
        const etagToSend = staleEntry.etag ?? fallbackEtag(key, staleEntry.stars, staleEntry.fetchedAt);
        res.setHeader('ETag', etagToSend);
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.setHeader('Vary', 'If-None-Match');
        if (clientEtag && clientEtag === etagToSend) {
          res.status(304).end();
          return;
        }
        const payload = toPayload(key, staleEntry, { fromCache: true, stale: true, rateLimited: true }, user, repo);
        res.status(200).json(payload);
        return;
      }

      const status = rateLimited ? 503 : ghResponse.status;
      res.status(status).json({ error: `GitHub request failed with status ${ghResponse.status}` });
      return;
    }

    const body = (await ghResponse.json()) as { stargazers_count?: number };
    const stars = typeof body?.stargazers_count === 'number' ? body.stargazers_count : 0;
    const etag = ghResponse.headers.get('etag') ?? fallbackEtag(key, stars, now);

    const entry: CacheEntry = {
      etag,
      stars,
      fetchedAt: now,
      expiresAt: now + FIVE_MINUTES,
    };

    cache.set(key, entry);

    const etagToSend = entry.etag ?? fallbackEtag(key, entry.stars, entry.fetchedAt);
    res.setHeader('ETag', etagToSend);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('Vary', 'If-None-Match');

    const payload = toPayload(key, entry, { fromCache: false, stale: false }, user, repo);
    res.status(200).json(payload);
  } catch (error) {
    if (cachedEntry) {
      const etagToSend = cachedEntry.etag ?? fallbackEtag(key, cachedEntry.stars, cachedEntry.fetchedAt);
      res.setHeader('ETag', etagToSend);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('Vary', 'If-None-Match');
      const payload = toPayload(key, cachedEntry, { fromCache: true, stale: true }, user, repo);
      res.status(200).json(payload);
      return;
    }

    res.status(500).json({ error: 'Unable to fetch repository information' });
  }
}
