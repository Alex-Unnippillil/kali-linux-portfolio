import ouiData from '../components/apps/kismet/oui.json';

const UNKNOWN_VENDOR = 'Unknown';

type OuiDataset = Record<string, string>;

type CacheStats = {
  cacheSize: number;
  mapSize: number;
};

let ouiMap: Map<string, string> | null = null;
const vendorCache = new Map<string, string>();

const normalizeOuiPrefix = (value?: string | null): string | null => {
  if (!value) return null;
  const cleaned = String(value).toUpperCase().replace(/[^0-9A-F]/g, '');
  if (cleaned.length !== 6) return null;
  return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}:${cleaned.slice(4, 6)}`;
};

const normalizeMacAddress = (value?: string | null): string | null => {
  if (!value) return null;
  const cleaned = String(value).toUpperCase().replace(/[^0-9A-F]/g, '');
  if (cleaned.length < 6) return null;
  const truncated = cleaned.slice(0, 12);
  const segments: string[] = [];
  for (let i = 0; i < truncated.length; i += 2) {
    const pair = truncated.slice(i, i + 2);
    if (pair.length === 2) {
      segments.push(pair);
    }
  }
  if (segments.length < 3) return null;
  return segments.join(':');
};

const ensureOuiMap = (): Map<string, string> => {
  if (!ouiMap) {
    ouiMap = new Map<string, string>();
    const dataset = ouiData as OuiDataset;
    for (const [prefix, vendor] of Object.entries(dataset)) {
      const normalizedPrefix = normalizeOuiPrefix(prefix);
      if (!normalizedPrefix) continue;
      const trimmedVendor = vendor.trim();
      if (!trimmedVendor) continue;
      ouiMap.set(normalizedPrefix, trimmedVendor);
    }
  }
  return ouiMap;
};

const cacheVendor = (mac: string, vendor: string): string => {
  vendorCache.set(mac, vendor);
  return vendor;
};

export const lookupVendor = (mac?: string | null): string => {
  const normalizedMac = normalizeMacAddress(mac);
  if (!normalizedMac) return UNKNOWN_VENDOR;
  const cached = vendorCache.get(normalizedMac);
  if (cached !== undefined) return cached;
  const ouiKey = normalizedMac.split(':').slice(0, 3).join(':');
  if (!ouiKey) return cacheVendor(normalizedMac, UNKNOWN_VENDOR);
  const map = ensureOuiMap();
  const vendor = map.get(ouiKey) ?? UNKNOWN_VENDOR;
  return cacheVendor(normalizedMac, vendor);
};

export const batchLookupVendors = (
  macs: Array<string | null | undefined>,
): string[] => {
  if (!Array.isArray(macs) || macs.length === 0) {
    return [];
  }
  const map = ensureOuiMap();
  return macs.map((mac) => {
    const normalizedMac = normalizeMacAddress(mac);
    if (!normalizedMac) return UNKNOWN_VENDOR;
    const cached = vendorCache.get(normalizedMac);
    if (cached !== undefined) return cached;
    const ouiKey = normalizedMac.split(':').slice(0, 3).join(':');
    const vendor = (ouiKey && map.get(ouiKey)) ?? UNKNOWN_VENDOR;
    return cacheVendor(normalizedMac, vendor);
  });
};

export const resetOuiCache = (): void => {
  vendorCache.clear();
  ouiMap = null;
};

export const getCacheStats = (): CacheStats => ({
  cacheSize: vendorCache.size,
  mapSize: ouiMap?.size ?? 0,
});

export { UNKNOWN_VENDOR };
