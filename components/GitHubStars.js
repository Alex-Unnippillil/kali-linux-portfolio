import React, { useCallback, useEffect, useMemo, useState } from 'react';

const CACHE_DURATION_MS = 5 * 60 * 1000;
const starCache = new Map();

const readCachedStars = (key) => {
  if (!key) return null;
  const cached = starCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION_MS) {
    starCache.delete(key);
    return null;
  }
  return cached.value;
};

const writeCachedStars = (key, value) => {
  if (!key) return;
  starCache.set(key, { value, timestamp: Date.now() });
};

const GitHubStars = ({ user, repo }) => {
  const cacheKey = useMemo(() => {
    if (!user || !repo) return null;
    return `${user}/${repo}`;
  }, [user, repo]);

  const initialStars = useMemo(() => readCachedStars(cacheKey), [cacheKey]);
  const [stars, setStars] = useState(initialStars);
  const [loading, setLoading] = useState(cacheKey ? initialStars === null : false);
  const [hasError, setHasError] = useState(false);

  const fetchStars = useCallback(
    async ({ force = false, signal } = {}) => {
      if (!cacheKey) return null;

      if (!force) {
        const cachedValue = readCachedStars(cacheKey);
        if (cachedValue !== null) {
          setStars(cachedValue);
          setLoading(false);
          setHasError(false);
          return cachedValue;
        }
      }

      setLoading(true);

      try {
        const res = await fetch(`https://api.github.com/repos/${user}/${repo}`, { signal });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();
        const count = data?.stargazers_count ?? 0;

        if (signal?.aborted) {
          return null;
        }

        writeCachedStars(cacheKey, count);
        setStars(count);
        setHasError(false);
        return count;
      } catch (error) {
        if (signal?.aborted) {
          return null;
        }
        console.error('Failed to fetch star count', error);
        setHasError(true);
        setStars(null);
        throw error;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [cacheKey, repo, user]
  );

  useEffect(() => {
    if (!cacheKey) {
      setStars(null);
      setLoading(false);
      setHasError(false);
      return;
    }

    const cachedValue = readCachedStars(cacheKey);
    setStars(cachedValue);
    setLoading(cachedValue === null);
    setHasError(false);
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheKey) return undefined;

    const controller = new AbortController();
    fetchStars({ signal: controller.signal }).catch(() => {
      /* error state handled in fetchStars */
    });

    return () => {
      controller.abort();
    };
  }, [cacheKey, fetchStars]);

  if (!repo) return null;

  return (
    <div
      className="inline-flex min-w-[3.5rem] items-center text-xs text-gray-300"
      aria-live="polite"
      aria-busy={loading}
    >
      {loading ? (
        <div className="flex h-5 w-full items-center">
          <div className="h-3 w-full animate-pulse rounded bg-white/20" />
        </div>
      ) : hasError ? (
        <span className="text-gray-400">⭐ —</span>
      ) : (
        <>
          <span className="whitespace-nowrap">⭐ {stars?.toLocaleString?.() ?? stars}</span>
          <button
            onClick={() => {
              fetchStars({ force: true }).catch(() => {
                /* handled within fetchStars */
              });
            }}
            aria-label="Refresh star count"
            className="ml-2 text-gray-400 transition hover:text-white"
            disabled={loading}
          >
            ↻
          </button>
        </>
      )}
    </div>
  );
};

export default GitHubStars;

