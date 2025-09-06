/** @jest-environment node */

import http from 'node:http';
import request from 'supertest';
import type { AddressInfo } from 'node:net';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

describe('middleware CSP header', () => {
  function createServer() {
    return http.createServer((req, res) => {
      const url = `http://localhost${req.url}`;
      const nextReq = new NextRequest(url, { headers: req.headers as Record<string, string> });
      const response = middleware(nextReq);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.statusCode = 200;
      res.end('ok');
    });
  }

  it('includes nonce and allowed hosts', async () => {
    const server = createServer();
    const res = await request(server).get('/');
    server.close();

    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain('nonce-');
    expect(csp).toContain('https://platform.twitter.com');
    expect(csp).toContain('https://cdn.jsdelivr.net');
  });

  it('omits unsafe-inline and sets a single nonce', async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://localhost:${port}/`);
    await new Promise<void>((resolve) => server.close(resolve));

    const csp = res.headers.get('content-security-policy') ?? '';
    const nonces = csp.match(/nonce-/g) || [];
    expect(nonces).toHaveLength(1);
    expect(csp).not.toContain("'unsafe-inline'");
  });
});
