import type { NextApiRequest, NextApiResponse } from 'next';
import {
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
  calculateJwkThumbprint,
} from 'jose';
import { createHash } from 'crypto';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

import { z } from 'zod';
import { validateRequest } from '../../lib/validate';

interface CacheEntry {
  jwk: any;
  expiry: number;
  thumbprint: string;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes fallback
const SUPPORTED_ALGS = [
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
];

function validateKey(k: any) {
  if (!k || typeof k !== 'object') return false;
  if (typeof k.kty !== 'string') return false;
  switch (k.kty) {
    case 'RSA':
      return typeof k.n === 'string' && typeof k.e === 'string';
    case 'EC':
      return (
        typeof k.crv === 'string' &&
        typeof k.x === 'string' &&
        typeof k.y === 'string'
      );
    case 'OKP':
      return typeof k.crv === 'string' && typeof k.x === 'string';
    default:
      return false;
  }
}

async function fetchAndCacheKeys(jwksUrl: string) {
  const resp = await fetch(jwksUrl);
  if (!resp.ok) throw new Error('fetch failed');
  const json = await resp.json();
  const keys = Array.isArray(json.keys) ? json.keys : [];
  let maxAge = DEFAULT_TTL / 1000;
  const cc = resp.headers.get('cache-control');
  const m = cc && /max-age=(\d+)/i.exec(cc);
  if (m) maxAge = parseInt(m[1], 10);
  const expiry = Date.now() + maxAge * 1000;
  const collisions = new Set<string>();
  const rotations = new Set<string>();
  const seenKids = new Set<string>();
  const processed = [] as any[];
  for (const k of keys) {
    if (!validateKey(k)) continue;
    const thumbprint = await calculateJwkThumbprint(k);
    processed.push({ ...k, jwkThumbprint: thumbprint });
    if (k.kid) {
      if (seenKids.has(k.kid)) collisions.add(k.kid);
      seenKids.add(k.kid);
      const existing = cache.get(k.kid);
      if (existing && existing.thumbprint !== thumbprint) rotations.add(k.kid);
      cache.set(k.kid, { jwk: k, expiry, thumbprint });
    }
  }
  return {
    keys: processed,
    collisions: Array.from(collisions),
    rotations: Array.from(rotations),
  };
}

function augmentKey(k: any) {
  const result: any = { ...k };
  const certB64 = k.x5c?.[0];
  if (certB64) {
    const der = Buffer.from(certB64, 'base64');
    const sha1 = createHash('sha1').update(der).digest('base64url');
    const sha256 = createHash('sha256').update(der).digest('base64url');
    result.thumbprintSHA1 = sha1;
    result.thumbprintSHA256 = sha256;
    if (k.x5t) result.x5tValid = k.x5t === sha1;
    if (k['x5t#S256']) result.x5tS256Valid = k['x5t#S256'] === sha256;
    result.pem =
      '-----BEGIN CERTIFICATE-----\n' +
      certB64.match(/.{1,64}/g)!.join('\n') +
      '\n-----END CERTIFICATE-----';
  }
  return result;
}

async function getKey(jwksUrl: string, kid: string) {
  const entry = cache.get(kid);
  if (entry && entry.expiry > Date.now()) return entry.jwk;
  const { keys } = await fetchAndCacheKeys(jwksUrl);
  return keys.find((k: any) => k.kid === kid);
}

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
};

const querySchema = z.object({ jwksUrl: z.string().url() });
const bodySchema = z.object({});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { jwksUrl: jwksUrlParam, jwt } =
    req.method === 'POST' ? req.body : (req.query as { [key: string]: any });

  if (typeof jwksUrlParam !== 'string') {
    res.status(400).json({ ok: false, error: 'invalid_url', keys: [] });
    return;
  }
  const parsed = validateRequest(req, res, {
    querySchema,
    bodySchema,
    queryLimit: 1024,
    bodyLimit: 1024,
  });
  if (!parsed) return;
  const { jwksUrl } = parsed.query as { jwksUrl: string };

  try {
    const url = new URL(jwksUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error('invalid');
  } catch {
    res.status(400).json({ ok: false, error: 'invalid_url', keys: [] });
    return;
  }

  const token = typeof jwt === 'string' ? jwt : null;

  try {
    if (token) {
      const { kid, alg } = decodeProtectedHeader(token);
      if (!kid) {
        res.status(400).json({ ok: false, error: 'missing_kid', keys: [] });
        return;
      }
      if (!alg || !SUPPORTED_ALGS.includes(alg)) {
        res.status(400).json({ ok: false, error: 'unsupported_alg', keys: [] });
        return;
      }
      let jwk = await getKey(jwksUrl, kid);
      if (!jwk) {
        res.status(400).json({ ok: false, error: 'kid_not_found', keys: [] });
        return;
      }
      const key = await importJWK(jwk, alg);
      const { payload, protectedHeader } = await jwtVerify(token, key);
      const { keys, collisions, rotations } = await fetchAndCacheKeys(jwksUrl);
      const augmented = keys.map(augmentKey);
      res.status(200).json({
        ok: true,
        keys: augmented,
        payload,
        header: protectedHeader,
        collisions,
        rotations,
      });
    } else {
      const { keys, collisions, rotations } = await fetchAndCacheKeys(jwksUrl);
      const augmented = keys.map(augmentKey);
      res.status(200).json({ ok: true, keys: augmented, collisions, rotations });
    }
  } catch (e: any) {
    res
      .status(500)
      .json({ ok: false, error: 'server_error', message: e?.message, keys: [] });
  }
}
