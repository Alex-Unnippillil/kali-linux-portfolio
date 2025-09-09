/** @jest-environment node */

import http from 'node:http';
import request from 'supertest';
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
    const res = await request(server).get('/es').set('Accept-Language', 'es');
    server.close();

    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain('nonce-');
    expect(csp).toContain('https://*.twitter.com');
    expect(csp).toContain('https://cdn.jsdelivr.net');
  });
});
