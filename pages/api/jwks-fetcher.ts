import type { NextApiRequest, NextApiResponse } from 'next';
import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import { createHash } from 'crypto';

interface CacheEntry {
  jwk: any;
  expiry: number;
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
  for (const k of keys) {
    if (k.kid) cache.set(k.kid, { jwk: k, expiry });
  }
  return keys;
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
  const keys = await fetchAndCacheKeys(jwksUrl);
  return keys.find((k: any) => k.kid === kid);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { jwksUrl, jwt } =
    req.method === 'POST' ? req.body : (req.query as { [key: string]: any });

  if (typeof jwksUrl !== 'string') {
    res.status(400).json({ ok: false, error: 'invalid_url', keys: [] });
    return;
  }

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
      const keys = await fetchAndCacheKeys(jwksUrl);
      const augmented = keys.map(augmentKey);
      res
        .status(200)
        .json({ ok: true, keys: augmented, payload, header: protectedHeader });
    } else {
      const keys = await fetchAndCacheKeys(jwksUrl);
      const augmented = keys.map(augmentKey);
      res.status(200).json({ ok: true, keys: augmented });
    }
  } catch (e: any) {
    res
      .status(500)
      .json({ ok: false, error: 'server_error', message: e?.message, keys: [] });
  }
}
