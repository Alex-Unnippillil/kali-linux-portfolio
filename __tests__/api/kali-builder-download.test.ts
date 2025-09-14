import handler from '../../pages/api/kali-builder/download';
import { createMocks } from 'node-mocks-http';
import { getJob, getDownloadUrl } from '../../lib/kaliBuilder';

jest.mock('../../lib/kaliBuilder', () => ({
  getJob: jest.fn(),
  getDownloadUrl: jest.fn(),
}));

describe('kali-builder download api', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('requires id', async () => {
    const { req, res } = createMocks({ method: 'GET', query: {} });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
  });

  test('returns 404 when job incomplete', async () => {
    (getJob as jest.Mock).mockResolvedValue({ id: '1', status: 'pending' });
    const { req, res } = createMocks({ method: 'GET', query: { id: '1' } });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(404);
  });

  test('returns url when job completed', async () => {
    (getJob as jest.Mock).mockResolvedValue({ id: '1', status: 'completed', artifactKey: 'file.iso' });
    (getDownloadUrl as jest.Mock).mockResolvedValue('https://example.com/download');
    const { req, res } = createMocks({ method: 'GET', query: { id: '1' } });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ url: 'https://example.com/download' });
  });
});
