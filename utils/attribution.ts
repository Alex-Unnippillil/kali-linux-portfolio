import { safeLocalStorage } from './safeStorage';

export const ATTRIBUTION_STORAGE_KEY = 'kali-attribution-session';
export const ATTRIBUTION_TTL_DAYS = 90;
export const ATTRIBUTION_TTL_MS = ATTRIBUTION_TTL_DAYS * 24 * 60 * 60 * 1000;

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type UTMParameter = (typeof UTM_KEYS)[number];

export type UTMMap = Partial<Record<UTMParameter, string>>;

export interface AttributionSession {
  utm: UTMMap;
  referrer?: string;
  landingPage?: string;
  createdAt: number;
  expiresAt: number;
}

export type AttributionMetadata = {
  referrer?: string;
  landingPage?: string;
} & UTMMap;

export interface AttributionInitOptions {
  location?: Pick<Location, 'href' | 'search' | 'pathname' | 'hash'>;
  referrer?: string | null;
  now?: number;
  respectDNT?: boolean;
}

declare global {
  interface Navigator {
    msDoNotTrack?: string | null;
  }

  interface Window {
    doNotTrack?: string | null;
  }
}

const normalizeString = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parseSearch = (search?: string): URLSearchParams | undefined => {
  if (!search) return undefined;
  const trimmed = search.trim();
  if (!trimmed) return undefined;
  return new URLSearchParams(trimmed.startsWith('?') ? trimmed : `?${trimmed}`);
};

const parseUTMParams = (search?: string): UTMMap => {
  const params = parseSearch(search);
  if (!params) return {};
  const result: UTMMap = {};
  for (const key of UTM_KEYS) {
    const value = normalizeString(params.get(key));
    if (value) {
      result[key] = value;
    }
  }
  return result;
};

const buildLandingPage = (location?: Pick<Location, 'href' | 'pathname' | 'search' | 'hash'>): string | undefined => {
  if (!location) return undefined;
  if (location.href) return location.href;
  const path = `${location.pathname ?? ''}${location.search ?? ''}${location.hash ?? ''}`;
  return path ? path : undefined;
};

const hasUTMValues = (utm: UTMMap): boolean => Object.keys(utm).length > 0;

const shouldOverride = (existing: AttributionSession | undefined, incoming: AttributionSession, now: number): boolean => {
  if (!existing) return true;
  if (existing.expiresAt <= now) return true;
  if (hasUTMValues(incoming.utm)) {
    if (!hasUTMValues(existing.utm)) return true;
    for (const key of UTM_KEYS) {
      if (incoming.utm[key] && incoming.utm[key] !== existing.utm[key]) {
        return true;
      }
    }
  }
  if (!existing.referrer && incoming.referrer) return true;
  if (!existing.landingPage && incoming.landingPage) return true;
  return false;
};

const serialize = (session: AttributionSession): string | undefined => {
  try {
    return JSON.stringify(session);
  } catch {
    return undefined;
  }
};

const deserialize = (raw: string | null): AttributionSession | undefined => {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<AttributionSession>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    if (typeof parsed.createdAt !== 'number' || typeof parsed.expiresAt !== 'number') return undefined;
    if (!parsed.utm || typeof parsed.utm !== 'object') return undefined;
    const utm: UTMMap = {};
    for (const key of UTM_KEYS) {
      const value = normalizeString((parsed.utm as UTMMap)[key]);
      if (value) {
        utm[key] = value;
      }
    }
    const session: AttributionSession = {
      utm,
      referrer: normalizeString(parsed.referrer ?? undefined),
      landingPage: normalizeString(parsed.landingPage ?? undefined),
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
    };
    return session;
  } catch {
    return undefined;
  }
};

export const clearAttributionSession = (): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};

export const readAttributionSession = (now: number = Date.now()): AttributionSession | undefined => {
  if (!safeLocalStorage) return undefined;
  const raw = safeLocalStorage.getItem(ATTRIBUTION_STORAGE_KEY);
  const session = deserialize(raw);
  if (!session) {
    if (raw) {
      clearAttributionSession();
    }
    return undefined;
  }
  if (session.expiresAt <= now) {
    clearAttributionSession();
    return undefined;
  }
  return session;
};

const persistSession = (session: AttributionSession): void => {
  if (!safeLocalStorage) return;
  const serialized = serialize(session);
  if (!serialized) return;
  try {
    safeLocalStorage.setItem(ATTRIBUTION_STORAGE_KEY, serialized);
  } catch {
    // ignore storage failures
  }
};

const createSession = (
  utm: UTMMap,
  referrer: string | undefined,
  landingPage: string | undefined,
  now: number
): AttributionSession => ({
  utm,
  referrer,
  landingPage,
  createdAt: now,
  expiresAt: now + ATTRIBUTION_TTL_MS,
});

const getDoNotTrackValues = (): (string | null | undefined)[] => {
  const values: (string | null | undefined)[] = [];
  if (typeof navigator !== 'undefined') {
    values.push(navigator.doNotTrack, navigator.msDoNotTrack);
  }
  if (typeof window !== 'undefined') {
    values.push(window.doNotTrack);
  }
  return values;
};

const normalizeDoNotTrackValue = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  return value.toString().toLowerCase();
};

export const isDoNotTrackEnabled = (): boolean => {
  return getDoNotTrackValues()
    .map(normalizeDoNotTrackValue)
    .some((value) => value === '1' || value === 'yes' || value === 'true');
};

export const initAttributionSession = (options: AttributionInitOptions = {}): AttributionSession | undefined => {
  const { location, referrer: providedReferrer, now = Date.now(), respectDNT = true } = options;
  if (respectDNT && isDoNotTrackEnabled()) {
    clearAttributionSession();
    return undefined;
  }

  const resolvedLocation = location ?? (typeof window !== 'undefined' ? window.location : undefined);
  const resolvedReferrer = normalizeString(
    providedReferrer ?? (typeof document !== 'undefined' ? document.referrer : undefined)
  );
  const utm = parseUTMParams(resolvedLocation?.search);
  const landingPage = buildLandingPage(resolvedLocation);

  if (!hasUTMValues(utm) && !resolvedReferrer) {
    const existing = readAttributionSession(now);
    return existing;
  }

  const newSession = createSession(utm, resolvedReferrer, landingPage, now);
  const existing = readAttributionSession(now);
  if (!shouldOverride(existing, newSession, now)) {
    return existing;
  }

  persistSession(newSession);
  return newSession;
};

const buildMetadataFromSession = (session: AttributionSession | undefined): AttributionMetadata | undefined => {
  if (!session) return undefined;
  const metadata: AttributionMetadata = { ...session.utm };
  if (session.referrer) {
    metadata.referrer = session.referrer;
  }
  if (session.landingPage) {
    metadata.landingPage = session.landingPage;
  }
  return metadata;
};

export const getAttributionMetadata = (): AttributionMetadata | undefined => {
  const session = readAttributionSession();
  return buildMetadataFromSession(session);
};
