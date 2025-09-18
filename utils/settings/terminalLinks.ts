const TRUSTED_PATHS_KEY = 'terminal-trusted-paths';
const SECURE_PASTE_KEY = 'terminal-secure-paste';

const LEADING_TRIM = /^(?:['"\u201c\u201d]+)/;
const TRAILING_TRIM = /(?:['"\u201c\u201d\]\)\}.,;:]+)$/;

export const DEFAULT_TRUSTED_PATHS: string[] = [];
export const DEFAULT_SECURE_PASTE = true;

const hasWindow = () => typeof window !== 'undefined' && !!window.localStorage;

const sanitizePaths = (paths: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    const normalized = normalizePath(path);
    if (!normalized) continue;
    const key = normalizedKey(normalized);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
};

const readStorage = (key: string): any => {
  if (!hasWindow()) return undefined;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
};

const writeStorage = (key: string, value: any) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const normalizedKey = (value: string): string => {
  return /^[a-z]:/i.test(value) ? value.toLowerCase() : value;
};

export const normalizePath = (input: string): string => {
  if (!input) return '';
  let value = input.trim();
  value = value.replace(/^file:\/\//i, '');
  value = value.replace(LEADING_TRIM, '');
  value = value.replace(TRAILING_TRIM, '');
  value = value.replace(/\\/g, '/');
  if (!value.startsWith('//')) {
    value = value.replace(/\/+/g, '/');
  } else {
    const [, rest] = value.match(/^(\/\/)(.*)$/) || ['', '', value];
    value = `//${rest.replace(/\/+/g, '/')}`;
  }
  if (/^[a-z]:/i.test(value)) {
    return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
  }
  return value;
};

export const isTrustedPath = (path: string, whitelist: string[]): boolean => {
  const target = normalizePath(path);
  if (!target) return false;
  const targetKey = normalizedKey(target);
  for (const entry of whitelist) {
    const normalizedEntry = normalizePath(entry);
    if (!normalizedEntry) continue;
    const entryKey = normalizedKey(normalizedEntry);
    if (targetKey === entryKey) return true;
    const prefix = entryKey.endsWith('/') ? entryKey : `${entryKey}/`;
    if (targetKey.startsWith(prefix)) return true;
  }
  return false;
};

export const getTrustedPaths = async (): Promise<string[]> => {
  const stored = readStorage(TRUSTED_PATHS_KEY);
  if (Array.isArray(stored)) {
    return sanitizePaths(stored);
  }
  return [...DEFAULT_TRUSTED_PATHS];
};

const persistTrustedPaths = async (paths: string[]): Promise<string[]> => {
  const sanitized = sanitizePaths(paths);
  if (hasWindow()) {
    writeStorage(TRUSTED_PATHS_KEY, sanitized);
  }
  return sanitized;
};

export const setTrustedPaths = async (
  paths: string[],
): Promise<string[]> => persistTrustedPaths(paths);

export const addTrustedPath = async (path: string): Promise<string[]> => {
  const normalized = normalizePath(path);
  if (!normalized) return getTrustedPaths();
  const current = await getTrustedPaths();
  if (current.some((entry) => normalizedKey(entry) === normalizedKey(normalized))) {
    return current;
  }
  return persistTrustedPaths([...current, normalized]);
};

export const removeTrustedPath = async (path: string): Promise<string[]> => {
  const normalized = normalizePath(path);
  if (!normalized) return getTrustedPaths();
  const current = await getTrustedPaths();
  const targetKey = normalizedKey(normalized);
  return persistTrustedPaths(
    current.filter((entry) => normalizedKey(entry) !== targetKey),
  );
};

export const getSecurePasteEnabled = async (): Promise<boolean> => {
  const stored = readStorage(SECURE_PASTE_KEY);
  if (typeof stored === 'boolean') return stored;
  if (typeof stored === 'string') return stored === 'true';
  return DEFAULT_SECURE_PASTE;
};

export const setSecurePasteEnabled = async (
  value: boolean,
): Promise<void> => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(SECURE_PASTE_KEY, value ? 'true' : 'false');
  } catch {
    // ignore
  }
};
