import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../pages/api/tls-chain';
import tls from 'tls';

describe('tls-chain api', () => {
  function createReqRes(host = 'example.com') {
    const req = { query: { host } } as unknown as NextApiRequest;
    const res: Partial<NextApiResponse> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return { req, res: res as NextApiResponse };
  }

  const rootCert: any = {
    subject: { CN: 'Root CA' },
    issuer: { CN: 'Root CA' },
    subjectaltname: 'DNS:root',
    valid_from: 'Jan 1 00:00:00 2020 GMT',
    valid_to: 'Jan 1 00:00:00 2030 GMT',
    fingerprint256: 'root',
  };
  rootCert.issuerCertificate = rootCert;

  const leafCert: any = {
    subject: { CN: 'example.com' },
    issuer: { CN: 'Root CA' },
    subjectaltname: 'DNS:example.com,DNS:www.example.com',
    valid_from: 'Jan 1 00:00:00 2024 GMT',
    valid_to: 'Jan 1 00:00:00 2025 GMT',
    fingerprint256: 'leaf',
    issuerCertificate: rootCert,
  };

  const mockSocket: any = {
    getPeerCertificate: jest.fn(() => leafCert),
    getCipher: jest.fn(() => ({ name: 'TLS_AES_128_GCM_SHA256', version: 'TLSv1.3' })),
    getProtocol: jest.fn(() => 'TLSv1.3'),
    end: jest.fn(),
    on: jest.fn(),
    ocspResponse: Buffer.from('00', 'hex'),
  };

  beforeAll(() => {
    (tls.connect as any) = jest.fn((_opts: any, cb: () => void) => {
      setTimeout(cb, 0);
      return mockSocket;
    });
  });

  it('returns tls details and caches result', async () => {
    const first = createReqRes();
    await handler(first.req, first.res);
    expect(first.res.status).toHaveBeenCalledWith(200);
    expect(first.res.json).toHaveBeenCalled();

    const second = createReqRes();
    await handler(second.req, second.res);

    expect((tls.connect as any)).toHaveBeenCalledTimes(1);
    const data = (first.res.json as jest.Mock).mock.calls[0][0];
    expect(data.chain.length).toBeGreaterThan(0);
    expect(data.cipher.name).toBe('TLS_AES_128_GCM_SHA256');
    expect(data.ocspStapled).toBe(true);
  });
});
