interface EpssEntry {
  epss: number;
  percentile: number;
}

interface CacheEntry {
  data: EpssEntry;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export async function fetchEpssScores(ids: string[]): Promise<Record<string, EpssEntry>> {
  const result: Record<string, EpssEntry> = {};
  const toFetch: string[] = [];
  for (const id of ids) {
    const cached = cache.get(id);
    if (cached && cached.expiry > Date.now()) {
      result[id] = cached.data;
    } else {
      toFetch.push(id);
    }
  }
  if (toFetch.length) {
    try {
      const url = `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(toFetch.join(','))}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        for (const item of json.data || []) {
          const entry = { epss: parseFloat(item.epss), percentile: parseFloat(item.percentile) };
          cache.set(item.cve, { data: entry, expiry: Date.now() + TTL });
          result[item.cve] = entry;
        }
      }
    } catch {
      // ignore network errors
    }
  }
  return result;
}
