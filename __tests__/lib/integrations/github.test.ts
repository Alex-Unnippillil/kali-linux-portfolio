/**
 * @jest-environment node
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { fetchGitHubRepoMetadata } from '../../../lib/integrations/github';

describe('fetchGitHubRepoMetadata', () => {
  const realFetch = global.fetch;
  let tempDir: string;
  let cwdSpy: jest.SpyInstance<string, []>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'github-meta-'));
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    global.fetch = realFetch;
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function mockResponse(
    body: Record<string, unknown>,
    status = 200,
    headers: Record<string, string> = {},
  ) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  }

  it('fetches metadata from GitHub and caches the result', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockResponse({
          stargazers_count: 42,
          forks_count: 7,
          open_issues_count: 3,
          watchers_count: 11,
          pushed_at: '2024-01-01T00:00:00Z',
          default_branch: 'main',
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const first = await fetchGitHubRepoMetadata('octocat/Hello-World', { maxAgeMs: 1000 });
    expect(first.stars).toBe(42);
    expect(first.forks).toBe(7);
    expect(first.stale).toBe(false);
    expect(first.source).toBe('remote');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    const second = await fetchGitHubRepoMetadata('octocat/Hello-World', { maxAgeMs: 1000 });
    expect(second.stale).toBe(false);
    expect(second.source).toBe('cache');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns cached metadata when the network request fails', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          stargazers_count: 10,
          forks_count: 2,
          open_issues_count: 1,
          watchers_count: 5,
          pushed_at: '2024-01-01T00:00:00Z',
          default_branch: 'main',
        }),
      )
      .mockRejectedValueOnce(new Error('network down'));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const initial = await fetchGitHubRepoMetadata('octocat/Hello-World', { maxAgeMs: 1000 });
    expect(initial.stale).toBe(false);
    const fallback = await fetchGitHubRepoMetadata('octocat/Hello-World', {
      maxAgeMs: 0,
      forceRefresh: true,
    });
    expect(fallback.stale).toBe(true);
    expect(fallback.error).toContain('network down');
    expect(fallback.stars).toBe(10);
  });

  it('flags rate limiting responses and retains cached data', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          stargazers_count: 12,
          forks_count: 2,
          open_issues_count: 0,
          watchers_count: 1,
          pushed_at: '2024-02-02T00:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({ message: 'API rate limit exceeded' }, 403, {
          'x-ratelimit-remaining': '0',
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const fresh = await fetchGitHubRepoMetadata('octocat/Hello-World', { maxAgeMs: 1000 });
    expect(fresh.rateLimited).toBeUndefined();

    const limited = await fetchGitHubRepoMetadata('octocat/Hello-World', {
      maxAgeMs: 0,
      forceRefresh: true,
    });
    expect(limited.rateLimited).toBe(true);
    expect(limited.stale).toBe(true);
    expect(limited.stars).toBe(12);
  });

  it('returns a stub metadata object when no cache exists and GitHub is rate limited', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockResponse({ message: 'API rate limit exceeded' }, 403, {
          'x-ratelimit-remaining': '0',
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await fetchGitHubRepoMetadata('octocat/Hello-World', {
      maxAgeMs: 0,
      forceRefresh: true,
    });
    expect(result.rateLimited).toBe(true);
    expect(result.stars).toBeNull();
    expect(result.stale).toBe(true);
  });
});
