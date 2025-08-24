import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../pages/api/mail-auth';

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

describe('mail auth api', () => {
  test('returns records with spf and dane', async () => {
    const bigKey = Buffer.alloc(128).toString('base64');
    (global as any).fetch = jest.fn((url: string) => {
      if (url.startsWith('https://cloudflare-dns.com')) {
        const u = new URL(url);
        const name = u.searchParams.get('name');
        const type = u.searchParams.get('type');
        let Answer: any[] = [];
        switch (name) {
          case 'example.com':
            Answer = [{ data: '"v=spf1 -all"' }];
            break;
          case '_dmarc.example.com':
            Answer = [{ data: '"v=DMARC1; p=reject"' }];
            break;
          case '_mta-sts.example.com':
            Answer = [{ data: '"v=STSv1; id=1"' }];
            break;
          case '_smtp._tls.example.com':
            Answer = [{ data: '"v=TLSRPTv1; rua=mailto:postmaster@example.com"' }];
            break;
          case 'default._bimi.example.com':
            Answer = [{ data: '"v=BIMI1; l=https://example.com/logo.svg"' }];
            break;
          case 'default._domainkey.example.com':
            Answer = [{ data: `"v=DKIM1; p=${bigKey}"` }];
            break;
          case '_25._tcp.example.com':
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ Answer: [{ data: '3 1 1 ABCDEF' }] }),
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ Answer }) });
      }
      if (url === 'https://mta-sts.example.com/.well-known/mta-sts.txt') {
        return Promise.resolve({ ok: true });
      }
      if (url === 'https://example.com/logo.svg') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    const req = {
      query: { domain: 'example.com' },
      headers: {},
      socket: { remoteAddress: '1.1.1.1' },
    } as unknown as NextApiRequest;
    const res: any = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data.spf.pass).toBe(true);
    expect(res.data.dane.pass).toBe(true);
  });
});
