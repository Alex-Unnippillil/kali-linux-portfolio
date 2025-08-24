/** @jest-environment node */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Response } from 'undici';


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

describe('mail-auth api', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  test('returns records for SPF, DKIM and DMARC', async () => {
    const { default: handler } = await import('../pages/api/mail-auth');
    (global as any).fetch = jest.fn((url: string) => {
      const name = new URL(url).searchParams.get('name');
      let answer: any[] = [];
      if (name === 'example.com') {
        answer = [{ data: '"v=spf1 -all"' }];
      } else if (name === '_dmarc.example.com') {
        answer = [{ data: '"v=DMARC1; p=reject"' }];
      } else if (name === 'default._domainkey.example.com') {
        const key = 'A'.repeat(172);
        answer = [{ data: `"v=DKIM1; p=${key}"` }];
      } else {
        answer = [];
      }
      return Promise.resolve(
        new Response(JSON.stringify({ Answer: answer }), { status: 200 })
      );
    });
    const req = {
      query: { domain: 'example.com' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data.spf.record).toContain('v=spf1');
    expect(res.data.dmarc.policy).toBe('reject');
    expect(res.data.dkim.pass).toBe(true);
  });

  test('handles network errors', async () => {
    const { default: handler } = await import('../pages/api/mail-auth');
    (global as any).fetch = jest.fn(() => Promise.reject(new Error('network')));
    const req = {
      query: { domain: 'example.com' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data.spf.pass).toBe(false);
    expect(res.data.spf.message).toMatch(/network/);
  });

  test('caches DNS lookups', async () => {
    const { default: handler } = await import('../pages/api/mail-auth');
    const fetchMock = jest.fn((url: string) => {
      const name = new URL(url).searchParams.get('name');
      const answer = [{ data: `"record for ${name}"` }];
      return Promise.resolve(
        new Response(JSON.stringify({ Answer: answer }), { status: 200 })
      );
    });
    (global as any).fetch = fetchMock;
    const req = {
      query: { domain: 'cache.com' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as NextApiRequest;
    const res1 = createRes();
    await handler(req, res1);
    const res2 = createRes();
    await handler(req, res2);
    expect(fetchMock).toHaveBeenCalledTimes(6);

  });

  test('validates input', async () => {
    const { default: handler } = await import('../pages/api/mail-auth');
    const req = {
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
