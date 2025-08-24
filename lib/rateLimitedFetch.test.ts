import { describe, it, expect, vi, afterEach } from 'vitest';
import { rateLimitedFetch } from './rateLimitedFetch';

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof window !== 'undefined') {
    localStorage.clear();
  }
});

describe('rateLimitedFetch', () => {
  it('returns data on success', async () => {
    const mockData = { ok: true };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockData), { status: 200 })));
    const result = await rateLimitedFetch('https://example.com');
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('fail');
    }));
    await expect(rateLimitedFetch('https://example.com', { retries: 0 })).rejects.toThrow('fail');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

