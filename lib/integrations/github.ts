import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = 1;

function getCacheFilename() {
  return path.join(process.cwd(), '.cache', 'github-metadata.json');
}

export type GitHubMetadataSource = 'remote' | 'cache' | 'build' | 'runtime';

export interface GitHubRepoMetadata {
  repo: string;
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  watchers: number | null;
  lastCommitDate: string | null;
  defaultBranch: string | null;
  fetchedAt: string;
  stale: boolean;
  source: GitHubMetadataSource;
  rateLimited?: boolean;
  error?: string;
}

interface StoredRepoMetadata extends Omit<GitHubRepoMetadata, 'stale' | 'source' | 'rateLimited' | 'error'> {}

interface CacheFile {
  version: number;
  entries: Record<string, StoredRepoMetadata>;
}

export interface FetchRepoOptions {
  maxAgeMs?: number;
  forceRefresh?: boolean;
}

function canonicalKey(repo: string) {
  return repo.toLowerCase();
}

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && !Number.isNaN(Date.parse(value));
}

async function ensureCacheDir() {
  await fs.mkdir(path.dirname(getCacheFilename()), { recursive: true });
}

async function readCache(): Promise<CacheFile> {
  const cacheFile = getCacheFilename();
  try {
    const raw = await fs.readFile(cacheFile, 'utf8');
    const parsed = JSON.parse(raw) as CacheFile;
    if (parsed && parsed.version === CACHE_VERSION && parsed.entries) {
      return parsed;
    }
  } catch (err) {
    // Ignore missing cache
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Failed to read GitHub cache', err);
    }
  }
  return { version: CACHE_VERSION, entries: {} };
}

async function writeCache(cache: CacheFile) {
  await ensureCacheDir();
  await fs.writeFile(getCacheFilename(), JSON.stringify(cache, null, 2), 'utf8');
}

function buildResponse(
  entry: StoredRepoMetadata,
  stale: boolean,
  source: GitHubMetadataSource,
  extras: Partial<Pick<GitHubRepoMetadata, 'rateLimited' | 'error'>> = {},
): GitHubRepoMetadata {
  return {
    ...entry,
    stale,
    source,
    ...extras,
  };
}

function emptyEntry(repo: string, fetchedAt?: string): StoredRepoMetadata {
  return {
    repo,
    stars: null,
    forks: null,
    openIssues: null,
    watchers: null,
    lastCommitDate: null,
    defaultBranch: null,
    fetchedAt: fetchedAt ?? new Date(0).toISOString(),
  };
}

function resolveRepoSlug(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname.toLowerCase() !== 'github.com') return null;
      const segments = url.pathname
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
      if (segments.length < 2) return null;
      return `${segments[0]}/${segments[1]}`;
    } catch {
      return null;
    }
  }
  return trimmed.replace(/\.git$/i, '');
}

export function normalizeRepoSlug(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return resolveRepoSlug(raw);
}

interface GitHubRepoResponse {
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  watchers_count?: number;
  subscribers_count?: number;
  pushed_at?: string;
  updated_at?: string;
  default_branch?: string;
}

function toStoredMetadata(repo: string, data: GitHubRepoResponse): StoredRepoMetadata {
  const fetchedAt = new Date().toISOString();
  const lastCommit = isIsoDate(data.pushed_at ?? '')
    ? data.pushed_at!
    : isIsoDate(data.updated_at ?? '')
    ? data.updated_at!
    : null;
  const watchers =
    typeof data.subscribers_count === 'number'
      ? data.subscribers_count
      : typeof data.watchers_count === 'number'
      ? data.watchers_count
      : null;

  return {
    repo,
    stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : null,
    forks: typeof data.forks_count === 'number' ? data.forks_count : null,
    openIssues: typeof data.open_issues_count === 'number' ? data.open_issues_count : null,
    watchers,
    lastCommitDate: lastCommit,
    defaultBranch: data.default_branch ?? null,
    fetchedAt,
  };
}

function isFresh(entry: StoredRepoMetadata, now: number, maxAge: number) {
  const fetched = Date.parse(entry.fetchedAt);
  if (Number.isNaN(fetched)) return false;
  return now - fetched < maxAge;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
  };
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchFromGitHub(repo: string): Promise<Response> {
  const url = `https://api.github.com/repos/${repo}`;
  return fetch(url, {
    headers: buildHeaders(),
  });
}

export async function fetchGitHubRepoMetadata(
  repoInput: string,
  options: FetchRepoOptions = {},
): Promise<GitHubRepoMetadata> {
  const repo = resolveRepoSlug(repoInput ?? '');
  if (!repo) {
    const stub = emptyEntry(repoInput ?? '');
    return buildResponse(stub, true, 'cache', {
      error: 'Invalid repository reference',
    });
  }

  const { maxAgeMs = DEFAULT_TTL_MS, forceRefresh = false } = options;
  const key = canonicalKey(repo);
  const now = Date.now();
  const cache = await readCache();
  const existing = cache.entries[key];

  if (existing && !forceRefresh && isFresh(existing, now, maxAgeMs)) {
    return buildResponse(existing, false, 'cache');
  }

  try {
    const response = await fetchFromGitHub(repo);
    if (!response.ok) {
      const remainingHeader = response.headers.get('x-ratelimit-remaining');
      const remaining = remainingHeader == null ? undefined : Number(remainingHeader);
      const isRateLimited =
        response.status === 403 && remaining !== undefined && Number.isFinite(remaining) && remaining <= 0;
      let message: string | undefined;
      try {
        const text = await response.text();
        message = text ? text.slice(0, 200) : undefined;
      } catch {
        message = undefined;
      }
      const errorMessage = message
        ? `GitHub responded with status ${response.status}: ${message}`
        : `GitHub responded with status ${response.status}`;
      if (existing) {
        return buildResponse(existing, true, 'cache', {
          rateLimited: isRateLimited || undefined,
          error: errorMessage,
        });
      }
      const stub = emptyEntry(repo);
      return buildResponse(stub, true, 'cache', {
        rateLimited: isRateLimited || undefined,
        error: errorMessage,
      });
    }

    const data = (await response.json()) as GitHubRepoResponse;
    const stored = toStoredMetadata(repo, data);
    cache.entries[key] = stored;
    await writeCache(cache);
    return buildResponse(stored, false, 'remote');
  } catch (error) {
    if (existing) {
      return buildResponse(existing, true, 'cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    const stub = emptyEntry(repo);
    return buildResponse(stub, true, 'cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
