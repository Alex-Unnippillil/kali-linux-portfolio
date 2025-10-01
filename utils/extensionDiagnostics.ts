import { safeLocalStorage } from './safeStorage';

export type ExtensionRegistration = {
  id: string;
  name: string;
  permissions: readonly string[];
};

export type ExtensionDiagnosticsEntry = {
  id: string;
  name: string;
  permissions: string[];
  initStartedAt: number;
  initCompletedAt?: number;
  initDurationMs?: number;
  messageCount: number;
  lastMessageAt?: number;
  enabled: boolean;
  disabledAt?: number;
};

export type ExtensionHandle = {
  markReady: (timestamp?: number) => void;
  logMessage: (count?: number, timestamp?: number) => void;
  dispose: () => void;
};

export type DiagnosticsListener = (entries: ExtensionDiagnosticsEntry[]) => void;

type StatusListener = (enabled: boolean) => void;

type InternalEntry = ExtensionDiagnosticsEntry & {
  permissions: string[];
};

type GlobalDiagnosticsState = {
  metrics: Map<string, InternalEntry>;
  listeners: Set<DiagnosticsListener>;
  statusListeners: Map<string, Set<StatusListener>>;
  disabledIds: Set<string>;
};

const STORAGE_KEY = 'extensions:softDisabled';
const GLOBAL_SYMBOL = Symbol.for('kali.extensionDiagnostics');

type GlobalWithDiagnostics = typeof globalThis & {
  [GLOBAL_SYMBOL]?: GlobalDiagnosticsState;
  __EXTENSION_DIAGNOSTICS__?: {
    getSnapshot: () => ExtensionDiagnosticsEntry[];
    setEnabled: (id: string, enabled: boolean) => boolean;
    toggle: (id: string) => boolean;
    recordMessage: (id: string, count?: number, timestamp?: number) => boolean;
  };
};

const globalObj = globalThis as GlobalWithDiagnostics;

const getDiagnosticsState = (): GlobalDiagnosticsState => {
  if (!globalObj[GLOBAL_SYMBOL]) {
    globalObj[GLOBAL_SYMBOL] = {
      metrics: new Map(),
      listeners: new Set(),
      statusListeners: new Map(),
      disabledIds: new Set(readDisabledFromStorage()),
    };
  }
  return globalObj[GLOBAL_SYMBOL]!;
};

function readDisabledFromStorage(): string[] {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

function persistDisabled(ids: Set<string>) {
  if (!safeLocalStorage) return;
  try {
    const list = Array.from(ids);
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function cloneEntry(entry: InternalEntry): ExtensionDiagnosticsEntry {
  return {
    ...entry,
    permissions: [...entry.permissions],
  };
}

function emitDiagnostics(state: GlobalDiagnosticsState) {
  const snapshot = Array.from(state.metrics.values())
    .map(cloneEntry)
    .sort((a, b) => a.name.localeCompare(b.name));
  state.listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // ignore listener failures
    }
  });
  attachDebugInterface();
}

export const getDiagnosticsSnapshot = (): ExtensionDiagnosticsEntry[] => {
  const state = getDiagnosticsState();
  return Array.from(state.metrics.values())
    .map(cloneEntry)
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const subscribeToDiagnostics = (listener: DiagnosticsListener): (() => void) => {
  const state = getDiagnosticsState();
  state.listeners.add(listener);
  listener(getDiagnosticsSnapshot());
  return () => {
    state.listeners.delete(listener);
  };
};

const ensureEntry = (id: string, draft: Partial<InternalEntry> & { id: string; name: string; permissions: readonly string[] }): InternalEntry => {
  const state = getDiagnosticsState();
  const existing = state.metrics.get(id);
  const now = Date.now();
  if (existing) {
    const mergedPermissions = new Set(existing.permissions);
    draft.permissions.forEach((perm) => mergedPermissions.add(perm));
    existing.permissions = Array.from(mergedPermissions);
    existing.name = draft.name;
    if (!existing.initStartedAt) existing.initStartedAt = now;
    emitDiagnostics(state);
    return existing;
  }
  const enabled = !state.disabledIds.has(id);
  const entry: InternalEntry = {
    id,
    name: draft.name,
    permissions: Array.from(new Set(draft.permissions)) as string[],
    initStartedAt: draft.initStartedAt ?? now,
    initCompletedAt: draft.initCompletedAt,
    initDurationMs: draft.initDurationMs,
    messageCount: draft.messageCount ?? 0,
    lastMessageAt: draft.lastMessageAt,
    enabled,
    disabledAt: enabled ? undefined : now,
  };
  state.metrics.set(id, entry);
  emitDiagnostics(state);
  return entry;
};

const setEnabledInternal = (id: string, enabled: boolean): boolean => {
  const state = getDiagnosticsState();
  const entry = state.metrics.get(id);
  if (!entry || entry.enabled === enabled) {
    return Boolean(entry);
  }
  entry.enabled = enabled;
  entry.disabledAt = enabled ? undefined : Date.now();
  if (enabled) {
    state.disabledIds.delete(id);
  } else {
    state.disabledIds.add(id);
  }
  persistDisabled(state.disabledIds);
  const listeners = state.statusListeners.get(id);
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        listener(enabled);
      } catch {
        // ignore
      }
    });
  }
  emitDiagnostics(state);
  return true;
};

const recordMessageInternal = (id: string, count = 1, timestamp = Date.now()): boolean => {
  const state = getDiagnosticsState();
  const entry = state.metrics.get(id);
  if (!entry) return false;
  if (count <= 0) return true;
  entry.messageCount += count;
  entry.lastMessageAt = timestamp;
  emitDiagnostics(state);
  return true;
};

export const setExtensionEnabled = (id: string, enabled: boolean): boolean => setEnabledInternal(id, enabled);

export const toggleExtensionEnabled = (id: string): boolean => {
  const state = getDiagnosticsState();
  const entry = state.metrics.get(id);
  if (!entry) return false;
  return setEnabledInternal(id, !entry.enabled);
};

export const recordExtensionMessage = (id: string, count = 1, timestamp = Date.now()): boolean =>
  recordMessageInternal(id, count, timestamp);

export const registerExtension = (
  extension: ExtensionRegistration,
  options?: { onEnabledChange?: StatusListener },
): ExtensionHandle => {
  const entry = ensureEntry(extension.id, {
    id: extension.id,
    name: extension.name,
    permissions: extension.permissions,
    initStartedAt: Date.now(),
  });
  if (options?.onEnabledChange) {
    const state = getDiagnosticsState();
    let listeners = state.statusListeners.get(extension.id);
    if (!listeners) {
      listeners = new Set();
      state.statusListeners.set(extension.id, listeners);
    }
    listeners.add(options.onEnabledChange);
    options.onEnabledChange(entry.enabled);
  }
  const handle: ExtensionHandle = {
    markReady: (timestamp = Date.now()) => {
      const state = getDiagnosticsState();
      const current = state.metrics.get(extension.id);
      if (!current) return;
      if (!current.initCompletedAt) {
        current.initCompletedAt = timestamp;
        current.initDurationMs = Math.max(0, timestamp - current.initStartedAt);
        emitDiagnostics(state);
      }
    },
    logMessage: (count = 1, timestamp = Date.now()) => {
      recordMessageInternal(extension.id, count, timestamp);
    },
    dispose: () => {
      const state = getDiagnosticsState();
      const listeners = state.statusListeners.get(extension.id);
      if (!listeners || !options?.onEnabledChange) return;
      listeners.delete(options.onEnabledChange);
      if (listeners.size === 0) {
        state.statusListeners.delete(extension.id);
      }
    },
  };
  return handle;
};

function attachDebugInterface() {
  const existing = globalObj.__EXTENSION_DIAGNOSTICS__ ?? {};
  globalObj.__EXTENSION_DIAGNOSTICS__ = {
    ...existing,
    getSnapshot: getDiagnosticsSnapshot,
    setEnabled: setExtensionEnabled,
    toggle: toggleExtensionEnabled,
    recordMessage: recordExtensionMessage,
  };
}

attachDebugInterface();
