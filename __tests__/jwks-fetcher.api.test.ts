/** @jest-environment node */
import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'undici';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../pages/api/jwks-fetcher';
jest.mock('jose');

function createRes() {
  return {
    statusCode: 0,
    data: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(d: any) {
      this.data = d;
      return this;
    },
  } as unknown as NextApiResponse;
}

describe('jwks-fetcher api', () => {
  test('verifies signature against sample JWS', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const jwk: any = publicKey.export({ format: 'jwk' });
    jwk.kid = 'test';
    jwk.use = 'sig';
    jwk.alg = 'RS256';
    const jwks = { keys: [jwk] };
    const jwksUrl = 'https://example.com/jwks';
    (global as any).fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(jwks), {
          status: 200,
          headers: { 'cache-control': 'max-age=60' },
        })
      )
    );
    const token = jwt.sign(
      { hello: 'world' },
      privateKey,
      { algorithm: 'RS256', keyid: 'test' }
    );

    const req = {
      method: 'POST',
      body: { jwksUrl, jwt: token },
      query: { jwksUrl },
    } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.payload.hello).toBe('world');
    expect(res.data.keys[0].useValid).toBe(true);
    expect(res.data.keys[0].algValid).toBe(true);
  });
});
