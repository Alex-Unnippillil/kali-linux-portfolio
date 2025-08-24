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
  const payload = jwt.verify(token, key, { algorithms: ['RS256'] }) as any;
  const decoded = jwt.decode(token, { complete: true }) as any;
  return { payload, protectedHeader: decoded ? decoded.header : {} };
}

export async function calculateJwkThumbprint(jwk: any) {
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  return createHash('sha256').update(canonical).digest('base64url');
}
