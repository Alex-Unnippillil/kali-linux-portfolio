import useSWR from 'swr';
import { useEffect } from 'react';

const MIRROR_CACHE_KEY = 'mirrors-cache';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch mirrors');
  }
  return res.json();
}

export function useMirrors() {
  const { data, error, isValidating, mutate } = useSWR('/api/mirrors', fetcher, {
    revalidateOnFocus: false,
    fallbackData: typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem(MIRROR_CACHE_KEY) || 'null')
      : null,
    onErrorRetry: (err, key, config, revalidate, { retryCount }) => {
      if (!navigator.onLine) return;
      if (retryCount >= 5) return;
      const timeout = Math.min(30000, 1000 * 2 ** retryCount);
      setTimeout(() => revalidate({ retryCount }), timeout);
    },
  });

  useEffect(() => {
    if (data) {
      try {
        localStorage.setItem(MIRROR_CACHE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    }
  }, [data]);

  return {
    mirrors: data as any,
    isLoading: !data && !error,
    error,
    mutate,
    isValidating,
  };
}

export default useMirrors;
