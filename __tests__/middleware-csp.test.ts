/** @jest-environment node */

import http from 'node:http';
import request from 'supertest';

jest.mock('next/server', () => ({
  NextRequest: class {
    headers: Headers;
    constructor(_url: string, init: { headers: Record<string, string> }) {
      this.headers = new Headers(init.headers);
    }
  },
  NextResponse: { next: () => ({ headers: new Headers() }) },
}));

const { NextRequest } = require('next/server');
const { middleware } = require('../middleware');

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

  it("omits 'unsafe-inline' and contains a single nonce", async () => {
    const server = createServer();
    const res = await request(server).get('/');
    server.close();

    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();

    const directives = csp.split(';').map((d) => d.trim().split(/\s+/).slice(1)).flat();
    expect(directives).not.toContain("'unsafe-inline'");

    const nonces = csp.match(/nonce-[^';\s]+/g) || [];
    expect(nonces).toHaveLength(1);
  });
});
