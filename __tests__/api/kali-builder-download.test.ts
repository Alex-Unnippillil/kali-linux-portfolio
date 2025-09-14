import handler from '../../pages/api/kali-builder/download';
import { createMocks } from 'node-mocks-http';

jest.mock('@aws-sdk/client-s3', () => ({
  __esModule: true,
  S3Client: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  __esModule: true,
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://example.com/file'),
}));

describe('kali builder download api', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete (global as any).fetch;
    delete process.env.KALI_BUILDER_API_URL;
    delete process.env.KALI_BUILDER_BUCKET;
  });

  test('returns pending status when job not complete', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'pending' }),
    });
    process.env.KALI_BUILDER_API_URL = 'https://builder';
    process.env.KALI_BUILDER_BUCKET = 'bucket';
    const { req, res } = createMocks({
      method: 'GET',
      query: { job: '123' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(202);
    expect(res._getJSONData()).toEqual({ ok: true, status: 'pending' });
  });

  test('returns url when job complete', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'complete', key: 'file.iso' }),
    });
    process.env.KALI_BUILDER_API_URL = 'https://builder';
    process.env.KALI_BUILDER_BUCKET = 'bucket';
    const { req, res } = createMocks({
      method: 'GET',
      query: { job: '123' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      ok: true,
      url: 'https://example.com/file',
    });
  });
});
