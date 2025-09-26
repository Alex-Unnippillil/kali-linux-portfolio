import type { ParsedUrlQuery } from 'querystring';

export interface DeepLinkContext {
  [key: string]: string;
}

export interface DeepLink {
  app: string;
  context?: DeepLinkContext;
}

const RESERVED_KEYS = new Set(['app']);

const coerceValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    return typeof last === 'string' ? last : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

export const parseDeepLinkFromQuery = (
  query: ParsedUrlQuery,
): DeepLink | null => {
  const app = coerceValue(query.app);
  if (!app) return null;

  const contextEntries = Object.entries(query)
    .filter(([key]) => !RESERVED_KEYS.has(key))
    .map(([key, value]) => [key, coerceValue(value)] as const)
    .filter(([, value]) => typeof value === 'string' && value.length > 0);

  if (contextEntries.length === 0) {
    return { app };
  }

  const context: DeepLinkContext = {};
  for (const [key, value] of contextEntries) {
    if (value) {
      context[key] = value;
    }
  }

  return { app, context };
};

export const hasDeepLink = (link: DeepLink | null | undefined): link is DeepLink => {
  return !!(link && typeof link.app === 'string' && link.app.length > 0);
};

export const normalizeDeepLinkContext = (
  app: string,
  context?: DeepLinkContext | null,
): DeepLinkContext | undefined => {
  if (!context || typeof context !== 'object') return undefined;
  const normalized: DeepLinkContext = {};
  Object.entries(context).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const str = typeof value === 'string' ? value : String(value);
    if (!str.length) return;
    normalized[key] = str;
  });
  if (app === 'terminal') {
    const candidate = ['initialCommand', 'command', 'cmd']
      .map((key) => normalized[key])
      .find((val) => typeof val === 'string' && val.trim().length > 0);
    if (candidate && normalized.initialCommand !== candidate) {
      normalized.initialCommand = candidate;
    }
  }
  return Object.keys(normalized).length ? normalized : undefined;
};

export const deepLinkSignature = (link: DeepLink | null | undefined): string | null => {
  if (!link || typeof link.app !== 'string') return null;
  const ctx = link.context;
  if (!ctx || typeof ctx !== 'object') {
    return link.app;
  }
  const keys = Object.keys(ctx).sort();
  const encoded = keys
    .map((key) => `${key}:${ctx[key]}`)
    .join('|');
  return `${link.app}|${encoded}`;
};

