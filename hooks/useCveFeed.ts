import useSWR from 'swr';
import type { CveFeed } from '../types/cve';
import { CVE_CACHE_MS, CVE_STALE_MS } from '../lib/cache/cve';

const fetcher = async (url: string): Promise<CveFeed> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch CVE feed');
  }
  return response.json();
};

export default function useCveFeed() {
  const swr = useSWR<CveFeed>('/api/cve', fetcher, {
    dedupingInterval: CVE_CACHE_MS,
    focusThrottleInterval: CVE_STALE_MS,
    keepPreviousData: true,
  });

  return {
    data: swr.data,
    error: swr.error,
    isLoading: swr.isLoading,
    mutate: swr.mutate,
  };
}
