import data from '../../../apps/kismet/data/oui.json';

type OuiPayload = {
  source: string;
  downloaded: string;
  vendors: string;
  entries: string;
};

type VendorMap = Map<string, string>;

type LookupCache = Map<string, string | null>;

const payload = data as OuiPayload;
const vendorList = payload.vendors ? payload.vendors.split('\n') : [];
let vendorMap: VendorMap | null = null;
const cache: LookupCache = new Map();

const normalize = (mac: string | null | undefined): string | null => {
  if (!mac) return null;
  const hex = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (hex.length < 6) return null;
  return hex.slice(0, 6);
};

const buildVendorMap = (): VendorMap => {
  if (vendorMap) return vendorMap;
  const map: VendorMap = new Map();
  if (payload.entries) {
    const entries = payload.entries.split(';');
    for (const entry of entries) {
      if (!entry) continue;
      const separator = entry.indexOf(':');
      if (separator <= 0) continue;
      const prefix = entry.slice(0, separator);
      const vendorIndex = Number(entry.slice(separator + 1));
      const vendor = vendorList[vendorIndex];
      if (prefix && vendor) {
        map.set(prefix, vendor);
      }
    }
  }
  vendorMap = map;
  return map;
};

const resolveVendorForPrefix = (prefix: string | null): string | null => {
  if (!prefix) return null;
  if (cache.has(prefix)) {
    return cache.get(prefix) ?? null;
  }
  const vendor = buildVendorMap().get(prefix) ?? null;
  cache.set(prefix, vendor);
  return vendor;
};

export const lookupVendor = (mac: string, fallback = 'Unknown'): string => {
  const vendor = resolveVendorForPrefix(normalize(mac));
  return vendor ?? fallback;
};

export const lookupBatch = (
  macs: readonly string[],
  fallback = 'Unknown',
): string[] => {
  if (!macs.length) return [];
  const result: string[] = new Array(macs.length);
  const pending: { index: number; prefix: string }[] = [];

  for (let i = 0; i < macs.length; i += 1) {
    const prefix = normalize(macs[i]);
    if (!prefix) {
      result[i] = fallback;
      continue;
    }
    const cached = cache.get(prefix);
    if (cached !== undefined) {
      result[i] = cached ?? fallback;
      continue;
    }
    pending.push({ index: i, prefix });
  }

  if (pending.length) {
    const map = buildVendorMap();
    for (const { index, prefix } of pending) {
      const vendor = map.get(prefix) ?? null;
      cache.set(prefix, vendor);
      result[index] = vendor ?? fallback;
    }
  }

  for (let i = 0; i < macs.length; i += 1) {
    if (result[i] === undefined) {
      const prefix = normalize(macs[i]);
      const vendor = prefix ? cache.get(prefix) ?? null : null;
      result[i] = vendor ?? fallback;
    }
  }

  return result;
};

export const normalizeOui = (mac: string | null | undefined): string | null =>
  normalize(mac);

export const __TEST__ = {
  clearCache: () => cache.clear(),
  cacheSize: () => cache.size,
  vendorCount: () => buildVendorMap().size,
};
