import { useSyncExternalStore } from 'react';
import { loadShellWindowLayouts, saveShellWindowLayouts, type PersistedLayoutMap, type PersistedWindowLayout } from '../utils/windowLayoutStorage';

export type WorkspaceId = string;

export interface WorkspaceDescriptor {
  id: WorkspaceId;
  label: string;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface ShellWindow {
  id: string;
  title: string;
  icon?: string;
  workspaceId: WorkspaceId;
  minimized?: boolean;
  maximized?: boolean;
  focused?: boolean;
  position?: WindowPosition;
  size?: WindowSize;
}

export interface WorkspaceOverviewState {
  open: boolean;
  focusedWorkspaceId: WorkspaceId | null;
}

export interface ShellState {
  workspaces: WorkspaceDescriptor[];
  activeWorkspaceId: WorkspaceId;
  windows: Record<string, ShellWindow>;
  workspaceWindows: Record<WorkspaceId, string[]>;
  persistedLayouts: PersistedLayoutMap;
  overview: WorkspaceOverviewState;
}

export interface RegisterWindowOptions {
  id: string;
  title: string;
  icon?: string;
  workspaceId?: WorkspaceId;
  position?: WindowPosition;
  size?: WindowSize;
  minimized?: boolean;
  maximized?: boolean;
  focused?: boolean;
}

interface StoreListener {
  (state: ShellState): void;
}

interface InternalStore {
  getState: () => ShellState;
  getInitialState: () => ShellState;
  setState: (updater: (state: ShellState) => ShellState) => void;
  subscribe: (listener: StoreListener) => () => void;
}

const DEFAULT_WORKSPACE_COUNT = 4;

const createDefaultWorkspaces = (count: number): WorkspaceDescriptor[] =>
  Array.from({ length: Math.max(count, 1) }, (_, index) => ({
    id: `workspace-${index + 1}`,
    label: `Workspace ${index + 1}`,
  }));

const buildWorkspaceWindowMap = (workspaces: WorkspaceDescriptor[]): Record<WorkspaceId, string[]> => {
  const map: Record<WorkspaceId, string[]> = {};
  workspaces.forEach((workspace) => {
    map[workspace.id] = [];
  });
  return map;
};

const persistedLayouts = loadShellWindowLayouts();

const initialWorkspaces = createDefaultWorkspaces(DEFAULT_WORKSPACE_COUNT);
const initialActiveWorkspaceId = initialWorkspaces[0]?.id ?? 'workspace-1';

let state: ShellState = {
  workspaces: initialWorkspaces,
  activeWorkspaceId: initialActiveWorkspaceId,
  windows: {},
  workspaceWindows: buildWorkspaceWindowMap(initialWorkspaces),
  persistedLayouts,
  overview: {
    open: false,
    focusedWorkspaceId: null,
  },
};

const initialStateSnapshot: ShellState = state;

const listeners = new Set<StoreListener>();

const updatePersistedLayouts = (next: ShellState, prev: ShellState): void => {
  if (next.persistedLayouts === prev.persistedLayouts) return;
  saveShellWindowLayouts(next.persistedLayouts);
};

const setState = (updater: (state: ShellState) => ShellState): void => {
  const previous = state;
  const next = updater(previous);
  if (next === previous) {
    return;
  }
  state = next;
  updatePersistedLayouts(next, previous);
  listeners.forEach((listener) => listener(state));
};

const subscribe = (listener: StoreListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const shellStore: InternalStore = {
  getState: () => state,
  getInitialState: () => initialStateSnapshot,
  setState,
  subscribe,
};

const ensureWorkspaceExists = (workspaceId: WorkspaceId, snapshot: ShellState): WorkspaceId => {
  const exists = snapshot.workspaces.some((workspace) => workspace.id === workspaceId);
  if (exists) {
    return workspaceId;
  }
  return snapshot.activeWorkspaceId;
};

const ensureWorkspaceWindowBucket = (
  workspaceWindows: Record<WorkspaceId, string[]>,
  workspaceId: WorkspaceId,
): Record<WorkspaceId, string[]> => {
  if (workspaceWindows[workspaceId]) {
    return workspaceWindows;
  }
  return { ...workspaceWindows, [workspaceId]: [] };
};

const mergeLayoutSnapshot = (
  previousLayouts: PersistedLayoutMap,
  windowId: string,
  patch: Partial<PersistedWindowLayout>,
): PersistedLayoutMap => {
  const existing = previousLayouts[windowId];
  const nextLayout: PersistedWindowLayout = {
    workspaceId: patch.workspaceId ?? existing?.workspaceId ?? '',
  };
  if (!nextLayout.workspaceId) {
    return previousLayouts;
  }
  if (patch.position) {
    nextLayout.position = patch.position;
  } else if (existing?.position) {
    nextLayout.position = existing.position;
  }
  if (patch.size) {
    nextLayout.size = patch.size;
  } else if (existing?.size) {
    nextLayout.size = existing.size;
  }
  return {
    ...previousLayouts,
    [windowId]: nextLayout,
  };
};

const removeWindowFromWorkspaceBuckets = (
  map: Record<WorkspaceId, string[]>,
  workspaceId: WorkspaceId,
  windowId: string,
): Record<WorkspaceId, string[]> => {
  const bucket = map[workspaceId];
  if (!bucket) return map;
  const nextBucket = bucket.filter((id) => id !== windowId);
  if (nextBucket === bucket) {
    return map;
  }
  return {
    ...map,
    [workspaceId]: nextBucket,
  };
};

const addWindowToWorkspaceBucket = (
  map: Record<WorkspaceId, string[]>,
  workspaceId: WorkspaceId,
  windowId: string,
): Record<WorkspaceId, string[]> => {
  const bucket = map[workspaceId] ?? [];
  if (bucket.includes(windowId)) {
    return map;
  }
  return {
    ...map,
    [workspaceId]: [...bucket, windowId],
  };
};

const shellActions = {
  registerWindow(options: RegisterWindowOptions): ShellWindow | null {
    if (!options.id) return null;
    const windowId = options.id;
    let createdWindow: ShellWindow | null = null;

    shellStore.setState((prev) => {
      const { windows } = prev;
      const existing = windows[windowId];
      if (existing) {
        const merged: ShellWindow = {
          ...existing,
          title: options.title || existing.title,
          icon: options.icon ?? existing.icon,
          minimized: options.minimized ?? existing.minimized,
          maximized: options.maximized ?? existing.maximized,
          focused: options.focused ?? existing.focused,
          position: options.position ?? existing.position,
          size: options.size ?? existing.size,
        };
        createdWindow = merged;
        return {
          ...prev,
          windows: {
            ...windows,
            [windowId]: merged,
          },
        };
      }

      const persistedLayout = prev.persistedLayouts[windowId];
      const resolvedWorkspaceId = ensureWorkspaceExists(
        options.workspaceId ?? persistedLayout?.workspaceId ?? prev.activeWorkspaceId,
        prev,
      );

      const windowRecord: ShellWindow = {
        id: windowId,
        title: options.title,
        icon: options.icon,
        workspaceId: resolvedWorkspaceId,
        minimized: options.minimized,
        maximized: options.maximized,
        focused: options.focused,
        position: options.position ?? persistedLayout?.position,
        size: options.size ?? persistedLayout?.size,
      };

      createdWindow = windowRecord;

      const nextWorkspaceWindows = addWindowToWorkspaceBucket(
        ensureWorkspaceWindowBucket(prev.workspaceWindows, resolvedWorkspaceId),
        resolvedWorkspaceId,
        windowId,
      );

      const nextLayouts = mergeLayoutSnapshot(prev.persistedLayouts, windowId, {
        workspaceId: resolvedWorkspaceId,
        position: windowRecord.position,
        size: windowRecord.size,
      });

      return {
        ...prev,
        windows: {
          ...windows,
          [windowId]: windowRecord,
        },
        workspaceWindows: nextWorkspaceWindows,
        persistedLayouts: nextLayouts,
      };
    });

    return createdWindow;
  },

  unregisterWindow(windowId: string): void {
    shellStore.setState((prev) => {
      if (!prev.windows[windowId]) return prev;
      const nextWindows = { ...prev.windows };
      const workspaceId = nextWindows[windowId].workspaceId;
      delete nextWindows[windowId];

      const nextWorkspaceWindows = removeWindowFromWorkspaceBuckets(
        prev.workspaceWindows,
        workspaceId,
        windowId,
      );

      return {
        ...prev,
        windows: nextWindows,
        workspaceWindows: nextWorkspaceWindows,
      };
    });
  },

  setActiveWorkspace(workspaceId: WorkspaceId): void {
    shellStore.setState((prev) => {
      const resolvedId = ensureWorkspaceExists(workspaceId, prev);
      if (resolvedId === prev.activeWorkspaceId) return prev;
      return {
        ...prev,
        activeWorkspaceId: resolvedId,
        overview: {
          ...prev.overview,
          focusedWorkspaceId: prev.overview.open
            ? resolvedId
            : prev.overview.focusedWorkspaceId,
        },
      };
    });
  },

  moveWindowToWorkspace(windowId: string, workspaceId: WorkspaceId): void {
    shellStore.setState((prev) => {
      const existing = prev.windows[windowId];
      if (!existing) return prev;
      const resolvedId = ensureWorkspaceExists(workspaceId, prev);
      if (resolvedId === existing.workspaceId) return prev;

      const nextWindow: ShellWindow = {
        ...existing,
        workspaceId: resolvedId,
      };

      const withoutPrevious = removeWindowFromWorkspaceBuckets(
        prev.workspaceWindows,
        existing.workspaceId,
        windowId,
      );
      const nextWorkspaceWindows = addWindowToWorkspaceBucket(
        ensureWorkspaceWindowBucket(withoutPrevious, resolvedId),
        resolvedId,
        windowId,
      );

      const nextLayouts = mergeLayoutSnapshot(prev.persistedLayouts, windowId, {
        workspaceId: resolvedId,
        position: existing.position,
        size: existing.size,
      });

      return {
        ...prev,
        windows: {
          ...prev.windows,
          [windowId]: nextWindow,
        },
        workspaceWindows: nextWorkspaceWindows,
        persistedLayouts: nextLayouts,
      };
    });
  },

  updateWindowPosition(windowId: string, position: WindowPosition): void {
    shellStore.setState((prev) => {
      const existing = prev.windows[windowId];
      if (!existing) return prev;
      const nextWindow: ShellWindow = {
        ...existing,
        position,
      };
      const nextLayouts = mergeLayoutSnapshot(prev.persistedLayouts, windowId, {
        workspaceId: existing.workspaceId,
        position,
      });
      return {
        ...prev,
        windows: {
          ...prev.windows,
          [windowId]: nextWindow,
        },
        persistedLayouts: nextLayouts,
      };
    });
  },

  updateWindowSize(windowId: string, size: WindowSize): void {
    shellStore.setState((prev) => {
      const existing = prev.windows[windowId];
      if (!existing) return prev;
      const nextWindow: ShellWindow = {
        ...existing,
        size,
      };
      const nextLayouts = mergeLayoutSnapshot(prev.persistedLayouts, windowId, {
        workspaceId: existing.workspaceId,
        size,
      });
      return {
        ...prev,
        windows: {
          ...prev.windows,
          [windowId]: nextWindow,
        },
        persistedLayouts: nextLayouts,
      };
    });
  },

  openWorkspaceOverview(focusedWorkspaceId?: WorkspaceId): void {
    shellStore.setState((prev) => {
      if (prev.overview.open) {
        const resolvedFocus = focusedWorkspaceId
          ? ensureWorkspaceExists(focusedWorkspaceId, prev)
          : prev.overview.focusedWorkspaceId ?? prev.activeWorkspaceId;
        if (resolvedFocus === prev.overview.focusedWorkspaceId) {
          return prev;
        }
        return {
          ...prev,
          overview: {
            ...prev.overview,
            focusedWorkspaceId: resolvedFocus,
          },
        };
      }
      const resolvedFocus = focusedWorkspaceId
        ? ensureWorkspaceExists(focusedWorkspaceId, prev)
        : prev.activeWorkspaceId;
      return {
        ...prev,
        overview: {
          open: true,
          focusedWorkspaceId: resolvedFocus,
        },
      };
    });
  },

  closeWorkspaceOverview(): void {
    shellStore.setState((prev) => {
      if (!prev.overview.open) return prev;
      return {
        ...prev,
        overview: {
          open: false,
          focusedWorkspaceId: null,
        },
      };
    });
  },

  focusWorkspace(workspaceId: WorkspaceId): void {
    shellStore.setState((prev) => {
      if (!prev.overview.open) return prev;
      const resolvedId = ensureWorkspaceExists(workspaceId, prev);
      if (resolvedId === prev.overview.focusedWorkspaceId) return prev;
      return {
        ...prev,
        overview: {
          ...prev.overview,
          focusedWorkspaceId: resolvedId,
        },
      };
    });
  },

  focusNextWorkspace(): void {
    shellStore.setState((prev) => {
      if (!prev.overview.open || prev.workspaces.length === 0) return prev;
      const currentFocus = prev.overview.focusedWorkspaceId ?? prev.activeWorkspaceId;
      const index = prev.workspaces.findIndex((workspace) => workspace.id === currentFocus);
      const nextIndex = index >= 0 ? (index + 1) % prev.workspaces.length : 0;
      const nextFocus = prev.workspaces[nextIndex].id;
      if (nextFocus === prev.overview.focusedWorkspaceId) return prev;
      return {
        ...prev,
        overview: {
          ...prev.overview,
          focusedWorkspaceId: nextFocus,
        },
      };
    });
  },

  focusPreviousWorkspace(): void {
    shellStore.setState((prev) => {
      if (!prev.overview.open || prev.workspaces.length === 0) return prev;
      const currentFocus = prev.overview.focusedWorkspaceId ?? prev.activeWorkspaceId;
      const index = prev.workspaces.findIndex((workspace) => workspace.id === currentFocus);
      const nextIndex = index >= 0
        ? (index - 1 + prev.workspaces.length) % prev.workspaces.length
        : prev.workspaces.length - 1;
      const nextFocus = prev.workspaces[nextIndex].id;
      if (nextFocus === prev.overview.focusedWorkspaceId) return prev;
      return {
        ...prev,
        overview: {
          ...prev.overview,
          focusedWorkspaceId: nextFocus,
        },
      };
    });
  },

  activateFocusedWorkspace(): void {
    shellStore.setState((prev) => {
      if (!prev.overview.open) return prev;
      const targetId = prev.overview.focusedWorkspaceId ?? prev.activeWorkspaceId;
      if (!targetId || targetId === prev.activeWorkspaceId) {
        return {
          ...prev,
          overview: {
            open: false,
            focusedWorkspaceId: null,
          },
        };
      }
      return {
        ...prev,
        activeWorkspaceId: targetId,
        overview: {
          open: false,
          focusedWorkspaceId: null,
        },
      };
    });
  },
};

const identitySelector = (value: ShellState): ShellState => value;

export function useShellStore(): ShellState;
export function useShellStore<T>(selector: (state: ShellState) => T): T;
export function useShellStore<T>(selector: (state: ShellState) => T = identitySelector as unknown as (state: ShellState) => T): T {
  return useSyncExternalStore(
    shellStore.subscribe,
    () => selector(shellStore.getState()),
    () => selector(shellStore.getInitialState()),
  );
}

export { shellActions, shellStore };
