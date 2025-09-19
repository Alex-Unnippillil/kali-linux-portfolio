import sriData from '../data/cdn-sri.json';

type SriEntry = {
  id: string;
  url: string;
  integrity: string;
};

type SriJson = {
  scripts: SriEntry[];
};

const data = sriData as SriJson;

const scriptEntries = data.scripts.reduce<Record<string, SriEntry>>((acc, entry) => {
  acc[entry.id] = entry;
  return acc;
}, {});

export const CDN_SCRIPT_IDS = Object.freeze(
  Object.keys(scriptEntries).reduce<Record<string, string>>((acc, id) => {
    acc[id] = id;
    return acc;
  }, {}),
);

const scriptEntriesByUrl = data.scripts.reduce<Record<string, SriEntry>>(
  (acc, entry) => {
    acc[entry.url] = entry;
    return acc;
  },
  {},
);

export const CDN_SCRIPT_URLS = Object.fromEntries(
  Object.values(scriptEntries).map((entry) => [entry.id, entry.url]),
) as Record<string, string>;

export const CDN_SCRIPT_INTEGRITY = Object.fromEntries(
  Object.values(scriptEntries).map((entry) => [entry.url, entry.integrity]),
) as Record<string, string>;

export const getCdnScriptIntegrity = (src: string): string | undefined =>
  scriptEntriesByUrl[src]?.integrity;

export const getCdnScriptUrl = (id: string): string | undefined =>
  scriptEntries[id]?.url;

export const applySriToScript = (
  script: HTMLScriptElement,
  identifier: string,
): HTMLScriptElement => {
  const entry = scriptEntries[identifier] ?? scriptEntriesByUrl[identifier];
  if (!entry) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[cdn-sri] Missing entry for ${identifier}`);
    }
    return script;
  }
  script.integrity = entry.integrity;
  script.crossOrigin = 'anonymous';
  if (!script.src) {
    script.src = entry.url;
  }
  return script;
};

export const createSriScript = (identifier: string): HTMLScriptElement => {
  const script = document.createElement('script');
  return applySriToScript(script, identifier);
};
