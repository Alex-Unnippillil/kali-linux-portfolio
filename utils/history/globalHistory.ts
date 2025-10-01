/*
 * Global history manager for undo/redo across desktop apps.
 */

export type HistoryActionResult = void | boolean;

export interface HistoryAction {
  undo: () => HistoryActionResult;
  redo?: () => HistoryActionResult;
  description?: string;
}

interface HistoryEntry extends HistoryAction {
  id: number;
  scope: string;
  timestamp: number;
}

export interface HistorySnapshot {
  activeScope: string | null;
  undoCounts: Record<string, number>;
  redoCounts: Record<string, number>;
  excluded: string[];
}

export interface ScopedHistory {
  scope: string;
  register: (action: HistoryAction) => number | null;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

let entryIdCounter = 0;
const historyStack: HistoryEntry[] = [];
const redoStack: HistoryEntry[] = [];
let activeScope: string | null = null;
const excludedScopes = new Set<string>();
const listeners = new Set<(snapshot: HistorySnapshot) => void>();

const notify = () => {
  const undoCounts: Record<string, number> = {};
  const redoCounts: Record<string, number> = {};
  historyStack.forEach((entry) => {
    undoCounts[entry.scope] = (undoCounts[entry.scope] ?? 0) + 1;
  });
  redoStack.forEach((entry) => {
    redoCounts[entry.scope] = (redoCounts[entry.scope] ?? 0) + 1;
  });
  const snapshot: HistorySnapshot = {
    activeScope,
    undoCounts,
    redoCounts,
    excluded: Array.from(excludedScopes),
  };
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('History listener failed', err);
    }
  });
};

const resolveScope = (scope?: string | null): string | null => {
  if (scope && scope.trim().length > 0) return scope;
  return activeScope;
};

const pruneRedo = (scope: string) => {
  for (let i = redoStack.length - 1; i >= 0; i -= 1) {
    if (redoStack[i].scope === scope) {
      redoStack.splice(i, 1);
    }
  }
};

const removeEntriesForScope = (scope: string) => {
  for (let i = historyStack.length - 1; i >= 0; i -= 1) {
    if (historyStack[i].scope === scope) {
      historyStack.splice(i, 1);
    }
  }
  for (let i = redoStack.length - 1; i >= 0; i -= 1) {
    if (redoStack[i].scope === scope) {
      redoStack.splice(i, 1);
    }
  }
};

const coerceBoolean = (value: HistoryActionResult): boolean => {
  if (typeof value === 'boolean') return value;
  return true;
};

export const registerHistoryAction = ({
  scope,
  undo,
  redo,
  description,
}: HistoryAction & { scope: string }): number | null => {
  if (!scope) {
    throw new Error('History actions require a scope identifier.');
  }
  if (excludedScopes.has(scope)) {
    return null;
  }
  const entry: HistoryEntry = {
    id: entryIdCounter += 1,
    scope,
    undo,
    redo,
    description,
    timestamp: Date.now(),
  };
  historyStack.push(entry);
  pruneRedo(scope);
  notify();
  return entry.id;
};

export const undo = (scope?: string | null): boolean => {
  const targetScope = resolveScope(scope);
  if (!targetScope || excludedScopes.has(targetScope)) return false;
  for (let i = historyStack.length - 1; i >= 0; i -= 1) {
    const entry = historyStack[i];
    if (entry.scope !== targetScope) continue;
    historyStack.splice(i, 1);
    let success = true;
    try {
      const result = entry.undo();
      success = coerceBoolean(result);
    } catch (err) {
      success = false;
      // eslint-disable-next-line no-console
      console.error('History undo failed', err);
    }
    if (!success) {
      historyStack.splice(i, 0, entry);
      notify();
      return false;
    }
    redoStack.push(entry);
    notify();
    return true;
  }
  return false;
};

export const redo = (scope?: string | null): boolean => {
  const targetScope = resolveScope(scope);
  if (!targetScope || excludedScopes.has(targetScope)) return false;
  for (let i = redoStack.length - 1; i >= 0; i -= 1) {
    const entry = redoStack[i];
    if (entry.scope !== targetScope) continue;
    if (!entry.redo) return false;
    redoStack.splice(i, 1);
    let success = true;
    try {
      const result = entry.redo();
      success = coerceBoolean(result);
    } catch (err) {
      success = false;
      // eslint-disable-next-line no-console
      console.error('History redo failed', err);
    }
    if (!success) {
      redoStack.splice(i, 0, entry);
      notify();
      return false;
    }
    historyStack.push(entry);
    notify();
    return true;
  }
  return false;
};

export const canUndo = (scope?: string | null): boolean => {
  const targetScope = resolveScope(scope);
  if (!targetScope || excludedScopes.has(targetScope)) return false;
  return historyStack.some((entry) => entry.scope === targetScope);
};

export const canRedo = (scope?: string | null): boolean => {
  const targetScope = resolveScope(scope);
  if (!targetScope || excludedScopes.has(targetScope)) return false;
  return redoStack.some((entry) => entry.scope === targetScope && typeof entry.redo === 'function');
};

export const clearHistory = (scope?: string): void => {
  if (!scope) {
    historyStack.length = 0;
    redoStack.length = 0;
    notify();
    return;
  }
  removeEntriesForScope(scope);
  notify();
};

export const setActiveScope = (scope: string | null): void => {
  activeScope = scope ?? null;
  notify();
};

export const getActiveScope = (): string | null => activeScope;

export const setExcludedScopes = (scopes: Iterable<string>): void => {
  excludedScopes.clear();
  for (const scope of scopes) {
    if (scope) {
      excludedScopes.add(scope);
      removeEntriesForScope(scope);
    }
  }
  notify();
};

export const addExcludedScope = (scope: string): void => {
  if (!scope) return;
  if (!excludedScopes.has(scope)) {
    excludedScopes.add(scope);
    removeEntriesForScope(scope);
    notify();
  }
};

export const removeExcludedScope = (scope: string): void => {
  if (!scope) return;
  if (excludedScopes.delete(scope)) {
    notify();
  }
};

export const isScopeExcluded = (scope: string): boolean => excludedScopes.has(scope);

export const subscribe = (listener: (snapshot: HistorySnapshot) => void): (() => void) => {
  listeners.add(listener);
  try {
    listener({
      activeScope,
      undoCounts: historyStack.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.scope] = (acc[entry.scope] ?? 0) + 1;
        return acc;
      }, {}),
      redoCounts: redoStack.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.scope] = (acc[entry.scope] ?? 0) + 1;
        return acc;
      }, {}),
      excluded: Array.from(excludedScopes),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('History listener initialisation failed', err);
  }
  return () => {
    listeners.delete(listener);
  };
};

export const createScopedHistory = (scope: string): ScopedHistory => ({
  scope,
  register: (action: HistoryAction) => registerHistoryAction({ scope, ...action }),
  undo: () => undo(scope),
  redo: () => redo(scope),
  clear: () => clearHistory(scope),
  canUndo: () => canUndo(scope),
  canRedo: () => canRedo(scope),
});

export const resetHistory = (): void => {
  historyStack.length = 0;
  redoStack.length = 0;
  entryIdCounter = 0;
  activeScope = null;
  excludedScopes.clear();
  notify();
};

