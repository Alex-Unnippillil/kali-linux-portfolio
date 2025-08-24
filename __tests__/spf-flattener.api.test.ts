import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('../lib/urlGuard', () => ({ setupUrlGuard: jest.fn() }));

import handler from '../pages/api/spf-flattener';

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

describe('spf flattener api', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('resolves nested includes and flattens record', async () => {
    const responses: Record<string, any> = {
      'example.com:TXT': {
        Answer: [
          {
            data: '"v=spf1 include:_spf.a.com include:_spf.b.com -all"',
            TTL: 300,
          },
        ],
      },
      '_spf.a.com:TXT': {
        Answer: [
          { data: '"v=spf1 ip4:1.1.1.1 -all"', TTL: 200 },
        ],
      },
      '_spf.b.com:TXT': {
        Answer: [
          { data: '"v=spf1 include:_spf.c.com a mx -all"', TTL: 200 },
        ],
      },
      '_spf.c.com:TXT': {
        Answer: [
          { data: '"v=spf1 ip4:2.2.2.2 ip6:2001:db8::1 -all"', TTL: 100 },
        ],
      },
      '_spf.b.com:A': {
        Answer: [{ data: '3.3.3.3', TTL: 60 }],
      },
      '_spf.b.com:AAAA': {
        Answer: [],
      },
      '_spf.b.com:MX': {
        Answer: [{ data: '0 mail.example.com', TTL: 60 }],
      },
      'mail.example.com:A': {
        Answer: [{ data: '4.4.4.4', TTL: 50 }],
      },
      'mail.example.com:AAAA': {
        Answer: [],
      },
    };

    global.fetch = jest.fn((url: string) => {
      const u = new URL(url);
      const key = `${u.searchParams.get('name')}:${u.searchParams.get('type')}`;
      const data = responses[key] || { Answer: [] };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as any);
    });

    const req = { method: 'GET', query: { domain: 'example.com' } } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const data = res.data;
    expect(data.lookups).toBe(9);
    expect(data.flattenedSpfRecord).toContain('ip4:1.1.1.1');
    expect(data.flattenedSpfRecord).toContain('ip4:2.2.2.2');
    expect(data.flattenedSpfRecord).toContain('ip6:2001:db8::1');
    expect(data.flattenedSpfRecord).toContain('ip4:3.3.3.3');
    expect(data.flattenedSpfRecord).toContain('ip4:4.4.4.4');
    expect(data.chain.includes).toHaveLength(2);
    expect(data.chain.includes[1].includes[0].domain).toBe('_spf.c.com');
  });

  test('warns when lookup limit exceeded', async () => {
    const responses: Record<string, any> = {
      'overflow.com:TXT': {
        Answer: [
          {
            data: '"v=spf1 include:a1.com include:a2.com include:a3.com include:a4.com include:a5.com include:a6.com include:a7.com include:a8.com include:a9.com include:a10.com include:a11.com -all"',
            TTL: 300,
          },
        ],
      },
    };
    for (let i = 1; i <= 11; i++) {
      responses[`a${i}.com:TXT`] = {
        Answer: [{ data: `"v=spf1 ip4:10.0.0.${i} -all"`, TTL: 300 }],
      };
    }

    global.fetch = jest.fn((url: string) => {
      const u = new URL(url);
      const key = `${u.searchParams.get('name')}:${u.searchParams.get('type')}`;
      const data = responses[key] || { Answer: [] };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as any);
    });

    const req = { method: 'GET', query: { domain: 'overflow.com' } } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const data = res.data;
    expect(data.lookups).toBe(10);
    expect(data.warnings.some((w: string) => w.includes('Lookup limit'))).toBe(true);
    expect(data.flattenedSpfRecord).not.toContain('10.0.0.10');
    expect(data.flattenedSpfRecord).not.toContain('10.0.0.11');
  });

  test('validates input', async () => {
    const req = { method: 'GET', query: {} } as unknown as NextApiRequest;
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
