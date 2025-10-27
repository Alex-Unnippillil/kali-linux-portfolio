export interface ModuleWorkspaceSession {
  workspace?: string;
  moduleId?: string;
  options?: Record<string, string>;
  result?: string;
  store?: Record<string, string>;
  tags?: string[];
}

const isRecordOfStrings = (value: unknown): value is Record<string, string> => {
  if (typeof value !== 'object' || value === null) return false;
  return Object.entries(value).every(
    ([key, val]) => typeof key === 'string' && typeof val === 'string',
  );
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const sanitizeRecord = (value: Record<string, string> | undefined) => {
  if (!value) return undefined;
  const entries = Object.entries(value)
    .filter(([, v]) => typeof v === 'string')
    .map(([k, v]) => [k, v] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return undefined;
  return Object.fromEntries(entries);
};

const encodeBase64Url = (value: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64url');
  }
  if (typeof btoa === 'function') {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
  }
  throw new Error('No base64 encoder available');
};

const decodeBase64Url = (value: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
  if (typeof atob === 'function') {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return atob(padded);
  }
  throw new Error('No base64 decoder available');
};

export const serializeModuleWorkspaceSession = (
  session: ModuleWorkspaceSession,
): string => {
  const payload: ModuleWorkspaceSession = {};
  if (session.workspace) {
    payload.workspace = session.workspace;
  }
  if (session.moduleId) {
    payload.moduleId = session.moduleId;
  }
  const sanitizedOptions = sanitizeRecord(session.options);
  if (sanitizedOptions) {
    payload.options = sanitizedOptions;
  }
  const sanitizedStore = sanitizeRecord(session.store);
  if (sanitizedStore) {
    payload.store = sanitizedStore;
  }
  if (session.result) {
    payload.result = session.result;
  }
  if (session.tags && session.tags.length) {
    payload.tags = [...new Set(session.tags.filter(tag => typeof tag === 'string'))];
    if (!payload.tags.length) {
      delete payload.tags;
    }
  }
  const json = JSON.stringify(payload);
  return encodeBase64Url(json);
};

export const deserializeModuleWorkspaceSession = (
  encoded: string | string[] | undefined,
): ModuleWorkspaceSession | null => {
  if (!encoded || Array.isArray(encoded)) return null;
  try {
    const raw = decodeBase64Url(encoded);
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const candidate: ModuleWorkspaceSession = {};
    if (typeof parsed.workspace === 'string' && parsed.workspace.trim()) {
      candidate.workspace = parsed.workspace;
    }
    if (typeof parsed.moduleId === 'string' && parsed.moduleId.trim()) {
      candidate.moduleId = parsed.moduleId;
    }
    if (isRecordOfStrings(parsed.options)) {
      candidate.options = parsed.options;
    }
    if (isRecordOfStrings(parsed.store)) {
      candidate.store = parsed.store;
    }
    if (typeof parsed.result === 'string' && parsed.result) {
      candidate.result = parsed.result;
    }
    if (isStringArray(parsed.tags)) {
      candidate.tags = parsed.tags;
    }
    return Object.keys(candidate).length ? candidate : null;
  } catch {
    return null;
  }
};

export const buildModuleWorkspaceLink = (
  baseUrl: string,
  session: ModuleWorkspaceSession,
): string => {
  const url = new URL(baseUrl);
  const token = serializeModuleWorkspaceSession(session);
  url.searchParams.set('restore', token);
  return url.toString();
};
