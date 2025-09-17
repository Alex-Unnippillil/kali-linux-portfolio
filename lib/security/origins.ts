import originsData from './trusted-origins.json';

/**
 * Central allowlist for third-party origins used across CSP and runtime fetches.
 * Update `trusted-origins.json` when adding new domains and keep the docs in sync.
 */
export const TRUSTED_ORIGINS = Object.freeze(originsData.origins);

export type TrustedOriginKey = keyof typeof TRUSTED_ORIGINS;

function resolveOrigins(keys: readonly TrustedOriginKey[] | undefined) {
  if (!keys?.length) return Object.freeze([] as string[]);
  const seen = new Set<string>();
  for (const key of keys) {
    const origin = TRUSTED_ORIGINS[key];
    if (!origin) {
      throw new Error(`Unknown trusted origin key: ${String(key)}`);
    }
    seen.add(origin);
  }
  return Object.freeze(Array.from(seen));
}

export const TRUSTED_ORIGIN_LIST = Object.freeze(
  Array.from(new Set(Object.values(TRUSTED_ORIGINS))),
) as readonly string[];

export type TrustedOrigin = (typeof TRUSTED_ORIGIN_LIST)[number];

type DirectiveConfig = typeof originsData.csp;
type MiddlewareConfig = typeof originsData.middleware;

export const TRUSTED_CSP_DIRECTIVES = Object.freeze({
  scriptSrc: resolveOrigins(originsData.csp.scriptSrc),
  connectSrc: resolveOrigins(originsData.csp.connectSrc),
  frameSrc: resolveOrigins(originsData.csp.frameSrc),
  styleSrc: resolveOrigins(originsData.csp.styleSrc),
  fontSrc: resolveOrigins(originsData.csp.fontSrc),
} satisfies { [K in keyof DirectiveConfig]: readonly string[] });

export const MIDDLEWARE_CSP_EXTENSIONS = Object.freeze({
  scriptSrc: resolveOrigins(originsData.middleware.scriptSrc),
  connectSrc: resolveOrigins(originsData.middleware.connectSrc),
  frameSrc: resolveOrigins(originsData.middleware.frameSrc),
  styleSrc: resolveOrigins(originsData.middleware.styleSrc),
  fontSrc: resolveOrigins(originsData.middleware.fontSrc),
} satisfies { [K in keyof MiddlewareConfig]: readonly string[] });

export function mergeCspSources(
  ...sources: readonly (readonly string[] | undefined)[]
): readonly string[] {
  const merged = new Set<string>();
  for (const list of sources) {
    if (!list?.length) continue;
    for (const origin of list) {
      merged.add(origin);
    }
  }
  return Object.freeze(Array.from(merged));
}
