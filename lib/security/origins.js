const originsData = require('./trusted-origins.json');

const TRUSTED_ORIGINS = Object.freeze({ ...originsData.origins });

const TRUSTED_ORIGIN_LIST = Object.freeze(
  Array.from(new Set(Object.values(TRUSTED_ORIGINS))),
);

function resolveOrigins(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return Object.freeze([]);
  const seen = new Set();
  for (const key of keys) {
    const origin = TRUSTED_ORIGINS[key];
    if (!origin) {
      throw new Error(`Unknown trusted origin key: ${String(key)}`);
    }
    seen.add(origin);
  }
  return Object.freeze(Array.from(seen));
}

const TRUSTED_CSP_DIRECTIVES = Object.freeze({
  scriptSrc: resolveOrigins(originsData.csp?.scriptSrc),
  connectSrc: resolveOrigins(originsData.csp?.connectSrc),
  frameSrc: resolveOrigins(originsData.csp?.frameSrc),
  styleSrc: resolveOrigins(originsData.csp?.styleSrc),
  fontSrc: resolveOrigins(originsData.csp?.fontSrc),
});

const MIDDLEWARE_CSP_EXTENSIONS = Object.freeze({
  scriptSrc: resolveOrigins(originsData.middleware?.scriptSrc),
  connectSrc: resolveOrigins(originsData.middleware?.connectSrc),
  frameSrc: resolveOrigins(originsData.middleware?.frameSrc),
  styleSrc: resolveOrigins(originsData.middleware?.styleSrc),
  fontSrc: resolveOrigins(originsData.middleware?.fontSrc),
});

function mergeCspSources(...sources) {
  const merged = new Set();
  for (const list of sources) {
    if (!Array.isArray(list) || list.length === 0) continue;
    for (const origin of list) {
      merged.add(origin);
    }
  }
  return Object.freeze(Array.from(merged));
}

module.exports = {
  TRUSTED_ORIGINS,
  TRUSTED_ORIGIN_LIST,
  TRUSTED_CSP_DIRECTIVES,
  MIDDLEWARE_CSP_EXTENSIONS,
  mergeCspSources,
};
