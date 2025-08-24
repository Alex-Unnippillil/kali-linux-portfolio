const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

let kevCache: { set: Set<string>; expiry: number } = { set: new Set(), expiry: 0 };

export async function loadKevSet(): Promise<Set<string>> {
  if (kevCache.expiry > Date.now()) return kevCache.set;
  try {
    const res = await fetch(KEV_URL);
    if (!res.ok) return kevCache.set;
    const json = await res.json();
    const set = new Set<string>();
    for (const v of json.vulnerabilities || []) {
      if (v.cveID) set.add(v.cveID);
    }
    kevCache = { set, expiry: Date.now() + 24 * 60 * 60 * 1000 };
  } catch {
    // ignore network errors
  }
  return kevCache.set;
}
