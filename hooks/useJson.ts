import useSWR from 'swr';

/**
 * Fetch JSON from a URL using SWR.
 * Returns SWR response with parsed JSON.
 */
const jsonFetcher = (url: string) => fetch(url).then((res) => res.json());

export default function useJson<T = any>(url: string | null) {
  return useSWR<T>(url, jsonFetcher);
}

