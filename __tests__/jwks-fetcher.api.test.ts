/** @jest-environment node */
import fs from 'fs';
import path from 'path';
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
  const fixtures = (name: string) =>
    fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

  test('verifies RS256 token using JWKS fixture', async () => {
    const jwksUrl = 'https://example.com/jwks';
    (global as any).fetch = jest.fn(() =>
      Promise.resolve(
        new Response(fixtures('rsa-jwks.json'), {
          status: 200,
          headers: { 'cache-control': 'max-age=60' },
        })
      )
    );
    const token = jwt.sign(
      { hello: 'world' },
      fixtures('rsa-private.pem'),
      { algorithm: 'RS256', keyid: 'rsa1' }
    );

    const req = {
      method: 'POST',
      body: { jwksUrl, jwt: token },
      query: { jwksUrl },
    } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.data.payload.hello).toBe('world');
  });

  test('verifies ES256 token using JWKS fixture', async () => {
    const jwksUrl = 'https://example.com/jwks';
    (global as any).fetch = jest.fn(() =>
      Promise.resolve(
        new Response(fixtures('ec-jwks.json'), {
          status: 200,
          headers: { 'cache-control': 'max-age=60' },
        })
      )
    );
    const token = jwt.sign(
      { sub: '123' },
      fixtures('ec-private.pem'),
      { algorithm: 'ES256', keyid: 'ec1' }
    );
    const req = {
      method: 'POST',
      body: { jwksUrl, jwt: token },
      query: { jwksUrl },
    } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data.payload.sub).toBe('123');
  });

  test('detects key rotation', async () => {
    const jwksUrl = 'https://example.com/jwks';
    (global as any).fetch = jest
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(fixtures('rsa-jwks.json'), {
            status: 200,
            headers: { 'cache-control': 'max-age=60' },
          })
        )
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(fixtures('rsa-jwks-rotated.json'), {
            status: 200,
            headers: { 'cache-control': 'max-age=60' },
          })
        )
      );

    const req1 = {
      method: 'GET',
      query: { jwksUrl },
    } as unknown as NextApiRequest;
    const res1 = createRes();
    await handler(req1, res1);

    const req2 = {
      method: 'GET',
      query: { jwksUrl },
    } as unknown as NextApiRequest;
    const res2 = createRes();
    await handler(req2, res2);

    expect(res2.data.rotations).toContain('rsa1');
    expect(res2.data.keys[0].rotatedAt).toBeDefined();
  });

  test('resolves issuer metadata', async () => {
    const issuer = 'https://issuer.example';
    const jwksUrl = 'https://issuer.example/keys';
    (global as any).fetch = jest
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ jwks_uri: jwksUrl }), { status: 200 })
        )
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(fixtures('rsa-jwks.json'), {
            status: 200,
            headers: { 'cache-control': 'max-age=60' },
          })
        )
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(fixtures('rsa-jwks.json'), {
            status: 200,
            headers: { 'cache-control': 'max-age=60' },
          })
        )
      );
    const token = jwt.sign(
      { foo: 'bar' },
      fixtures('rsa-private.pem'),
      { algorithm: 'RS256', keyid: 'rsa1', issuer }
    );
    const req = {
      method: 'POST',
      body: { issuer, jwt: token },
      query: { issuer },
    } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data.payload.foo).toBe('bar');
  });
});
