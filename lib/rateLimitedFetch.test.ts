import { rateLimitedFetch } from './rateLimitedFetch';

afterEach(() => {
  jest.restoreAllMocks();
  if (typeof window !== 'undefined') {
    localStorage.clear();
  }
});

describe('rateLimitedFetch', () => {
  it('returns data on success', async () => {
    const mockData = { ok: true };
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify(mockData), { status: 200 })
    ) as any;
    const result = await rateLimitedFetch('https://example.com');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on error', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('fail');
    }) as any;
    await expect(
      rateLimitedFetch('https://example.com', { retries: 0 })
    ).rejects.toThrow('fail');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

