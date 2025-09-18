import { get, set } from 'idb-keyval';

export interface HttpEnvironment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

export interface HttpEnvironmentState {
  environments: HttpEnvironment[];
  activeEnvironmentId: string | null;
}

export type HttpEnvironmentListener = (state: HttpEnvironmentState) => void;

const ENVIRONMENTS_KEY = 'http:environments';
const ACTIVE_ENVIRONMENT_KEY = 'http:active-environment';
const DEFAULT_ENVIRONMENT_ID = 'http-env-default';
const PLACEHOLDER_PATTERN = /{{\s*([A-Za-z0-9_.-]+)\s*}}/g;

type UpdateResult<T = void> = {
  state: HttpEnvironmentState;
  value?: T;
};

const listeners = new Set<HttpEnvironmentListener>();
let loadPromise: Promise<void> | null = null;
let state: HttpEnvironmentState = createInitialState();

function isClient() {
  return typeof window !== 'undefined';
}

function createDefaultEnvironment(): HttpEnvironment {
  return { id: DEFAULT_ENVIRONMENT_ID, name: 'Default', variables: {} };
}

function createInitialState(): HttpEnvironmentState {
  const env = createDefaultEnvironment();
  return { environments: [env], activeEnvironmentId: env.id };
}

function generateEnvironmentId(): string {
  return `env-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeVariables(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};

  const result: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (typeof rawKey !== 'string') continue;
    const trimmedKey = rawKey.trim();
    if (!trimmedKey) continue;
    if (rawValue === undefined) continue;
    result[trimmedKey] = typeof rawValue === 'string' ? rawValue : String(rawValue);
  }
  return result;
}

function sanitizeEnvironments(input: unknown): HttpEnvironment[] {
  if (!Array.isArray(input)) return createInitialState().environments;

  const sanitized: HttpEnvironment[] = [];
  const seenIds = new Set<string>();

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as Partial<HttpEnvironment>;
    let id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : generateEnvironmentId();
    while (seenIds.has(id)) {
      id = generateEnvironmentId();
    }
    seenIds.add(id);
    const name = typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : 'Environment';
    const variables = sanitizeVariables(candidate.variables);
    sanitized.push({ id, name, variables });
  }

  if (!sanitized.length) {
    return createInitialState().environments;
  }

  return sanitized;
}

function ensureActiveEnvironmentId(
  environments: HttpEnvironment[],
  preferredId: string | null | undefined,
): string | null {
  if (!environments.length) return null;
  if (preferredId && environments.some((env) => env.id === preferredId)) {
    return preferredId;
  }
  return environments[0].id;
}

async function loadFromStorage(): Promise<void> {
  if (!isClient()) return;
  try {
    const [storedEnvironments, storedActiveId] = await Promise.all([
      get<HttpEnvironment[]>(ENVIRONMENTS_KEY),
      get<string | null>(ACTIVE_ENVIRONMENT_KEY),
    ]);
    const environments = sanitizeEnvironments(storedEnvironments);
    const activeEnvironmentId = ensureActiveEnvironmentId(
      environments,
      typeof storedActiveId === 'string' ? storedActiveId : null,
    );
    state = { environments, activeEnvironmentId };
  } catch {
    state = createInitialState();
  }
  notify();
}

async function ensureReady(): Promise<void> {
  if (!loadPromise) {
    loadPromise = loadFromStorage();
  }
  await loadPromise;
}

function notify(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

async function persistState(): Promise<void> {
  if (!isClient()) return;
  try {
    await Promise.all([
      set(ENVIRONMENTS_KEY, state.environments),
      set(ACTIVE_ENVIRONMENT_KEY, state.activeEnvironmentId),
    ]);
  } catch {
    // Ignore persistence errors in environments where IndexedDB is unavailable
  }
}

function updateEnvironmentState(
  current: HttpEnvironmentState,
  envId: string,
  updater: (environment: HttpEnvironment) => HttpEnvironment | null | undefined,
): HttpEnvironmentState | null {
  const index = current.environments.findIndex((env) => env.id === envId);
  if (index === -1) return null;
  const environment = current.environments[index];
  const updated = updater(environment);
  if (!updated || updated === environment) return null;
  const environments = current.environments.slice();
  environments[index] = updated;
  return { environments, activeEnvironmentId: current.activeEnvironmentId };
}

async function applyUpdate<T>(
  mutator: (current: HttpEnvironmentState) => UpdateResult<T> | null | undefined,
): Promise<T | undefined> {
  await ensureReady();
  const result = mutator(state);
  if (!result) return undefined;
  const { state: nextState, value } = result;
  if (
    nextState.environments === state.environments &&
    nextState.activeEnvironmentId === state.activeEnvironmentId
  ) {
    return value;
  }
  state = nextState;
  notify();
  await persistState();
  return value;
}

function getActiveEnvironmentFromState(
  snapshot: HttpEnvironmentState,
): HttpEnvironment | undefined {
  const { environments, activeEnvironmentId } = snapshot;
  return (
    environments.find((env) => env.id === activeEnvironmentId) ??
    environments[0]
  );
}

export const httpEnvironmentStore = {
  ready: ensureReady,
  subscribe(listener: HttpEnvironmentListener) {
    listeners.add(listener);
    void ensureReady();
    return () => {
      listeners.delete(listener);
    };
  },
  getState(): HttpEnvironmentState {
    return state;
  },
  getActiveEnvironment(): HttpEnvironment | undefined {
    return getActiveEnvironmentFromState(state);
  },
  async createEnvironment(
    name?: string,
    variables: Record<string, string> = {},
  ): Promise<HttpEnvironment> {
    const created = await applyUpdate<HttpEnvironment>((current) => {
      const environment: HttpEnvironment = {
        id: generateEnvironmentId(),
        name:
          name && name.trim()
            ? name.trim()
            : defaultEnvironmentName(current.environments),
        variables: sanitizeVariables(variables),
      };
      return {
        state: {
          environments: [...current.environments, environment],
          activeEnvironmentId: current.activeEnvironmentId ?? environment.id,
        },
        value: environment,
      };
    });
    return created ?? getActiveEnvironmentFromState(state)!;
  },
  async removeEnvironment(envId: string): Promise<void> {
    await applyUpdate((current) => {
      const environments = current.environments.filter((env) => env.id !== envId);
      if (environments.length === current.environments.length) return null;
      if (!environments.length) {
        const initial = createInitialState();
        return { state: initial };
      }
      const activeEnvironmentId =
        current.activeEnvironmentId === envId
          ? ensureActiveEnvironmentId(environments, null)
          : current.activeEnvironmentId;
      return { state: { environments, activeEnvironmentId } };
    });
  },
  async renameEnvironment(envId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    await applyUpdate((current) => {
      const next = updateEnvironmentState(current, envId, (environment) => {
        if (environment.name === trimmed) return environment;
        return { ...environment, name: trimmed };
      });
      return next ? { state: next } : null;
    });
  },
  async setActiveEnvironment(envId: string): Promise<void> {
    await applyUpdate((current) => {
      if (!current.environments.length) {
        const initial = createInitialState();
        return { state: initial };
      }
      const nextId = ensureActiveEnvironmentId(current.environments, envId);
      if (nextId === current.activeEnvironmentId) return null;
      return { state: { environments: current.environments, activeEnvironmentId: nextId } };
    });
  },
  async setEnvironmentVariable(envId: string, key: string, value: string): Promise<void> {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    await applyUpdate((current) => {
      const next = updateEnvironmentState(current, envId, (environment) => {
        const existing = environment.variables[normalizedKey];
        if (existing === value && normalizedKey in environment.variables) {
          return environment;
        }
        return {
          ...environment,
          variables: { ...environment.variables, [normalizedKey]: value },
        };
      });
      return next ? { state: next } : null;
    });
  },
  async renameEnvironmentVariable(envId: string, fromKey: string, toKey: string): Promise<void> {
    const trimmed = toKey.trim();
    if (!trimmed) return;
    await applyUpdate((current) => {
      const next = updateEnvironmentState(current, envId, (environment) => {
        if (!(fromKey in environment.variables)) return environment;
        if (trimmed === fromKey) return environment;
        const value = environment.variables[fromKey];
        const variables = { ...environment.variables };
        delete variables[fromKey];
        variables[trimmed] = value;
        return { ...environment, variables };
      });
      return next ? { state: next } : null;
    });
  },
  async deleteEnvironmentVariable(envId: string, key: string): Promise<void> {
    await applyUpdate((current) => {
      const next = updateEnvironmentState(current, envId, (environment) => {
        if (!(key in environment.variables)) return environment;
        const variables = { ...environment.variables };
        delete variables[key];
        return { ...environment, variables };
      });
      return next ? { state: next } : null;
    });
  },
};

function defaultEnvironmentName(environments: HttpEnvironment[]): string {
  const base = 'Environment';
  const existingNames = new Set(environments.map((env) => env.name));
  let index = environments.length + 1;
  let candidate = `${base} ${index}`;
  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${base} ${index}`;
  }
  return candidate;
}

export function resolveTemplateWithVariables(
  template: string,
  variables: Record<string, string>,
): string {
  if (!template) return template;
  PLACEHOLDER_PATTERN.lastIndex = 0;
  return template.replace(
    PLACEHOLDER_PATTERN,
    (match, rawName: string, offset: number, original: string) => {
      const key = rawName.trim();
      if (!key) return match;
      const before = offset > 0 ? original[offset - 1] : undefined;
      const after = original[offset + match.length];
      if (before === '{' || after === '}') {
        return match;
      }
      return Object.prototype.hasOwnProperty.call(variables, key)
        ? variables[key]
        : match;
    },
  );
}

export function resolveTemplate(
  template: string,
  environment?: HttpEnvironment | null,
): string {
  return resolveTemplateWithVariables(template, environment?.variables ?? {});
}

export function extractPlaceholders(template: string): string[] {
  if (!template) return [];
  PLACEHOLDER_PATTERN.lastIndex = 0;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_PATTERN.exec(template))) {
    const [fullMatch, rawName] = match;
    const key = rawName?.trim();
    if (!key) continue;
    const before = match.index > 0 ? template[match.index - 1] : undefined;
    const after = template[match.index + fullMatch.length];
    if (before === '{' || after === '}') continue;
    found.add(key);
  }
  return Array.from(found);
}

export async function __dangerous__resetHttpEnvironmentStoreForTests(): Promise<void> {
  state = createInitialState();
  loadPromise = null;
  notify();
  if (isClient()) {
    try {
      await Promise.all([
        set(ENVIRONMENTS_KEY, state.environments),
        set(ACTIVE_ENVIRONMENT_KEY, state.activeEnvironmentId),
      ]);
    } catch {
      // ignore reset errors in non-indexedDB environments
    }
  }
}

export default httpEnvironmentStore;
