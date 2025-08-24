import jwt from 'jsonwebtoken';
import { createHash, createPublicKey } from 'crypto';

export function decodeProtectedHeader(token: string) {
  const decoded = jwt.decode(token, { complete: true }) as any;
  return decoded ? decoded.header : {};
}

export async function importJWK(jwk: any) {
  return createPublicKey({ key: jwk, format: 'jwk' });
}

export async function jwtVerify(token: string, key: any) {
  const decoded = jwt.decode(token, { complete: true }) as any;
  const alg = decoded?.header?.alg || 'RS256';
  const payload = jwt.verify(token, key, { algorithms: [alg] }) as any;
  return { payload, protectedHeader: decoded ? decoded.header : {} };
}

export async function calculateJwkThumbprint(jwk: any) {
  const canonical: Record<string, string> = {};
  for (const prop of ['crv', 'e', 'kty', 'n', 'x', 'y']) {
    if (jwk[prop]) canonical[prop] = jwk[prop];
  }
  return createHash('sha256').update(JSON.stringify(canonical)).digest('base64url');
}
