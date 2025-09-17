import { getMirrorStatus } from '../lib/mirrorStatus';

test('getMirrorStatus returns parsed data', async () => {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: 'up',
      last_sync: '2025-09-14T00:00:00Z',
      traffic: { http: 123, rsync: 45 },
    }),
  });
  const data = await getMirrorStatus(mockFetch as any);
  expect(data).toEqual({
    status: 'up',
    last_sync: '2025-09-14T00:00:00Z',
    traffic: { http: 123, rsync: 45 },
  });
});

test('getMirrorStatus handles errors', async () => {
  const mockFetch = jest.fn().mockRejectedValue(new Error('fail'));
  const data = await getMirrorStatus(mockFetch as any);
  expect(data).toBeNull();
});
