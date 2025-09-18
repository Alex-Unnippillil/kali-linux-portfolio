"use client";

import { useCallback } from 'react';
import usePersistentState from './usePersistentState';

export interface WorkspacePreferences {
  evidencePanelOpen?: boolean;
  [key: string]: unknown;
}

export interface WorkspaceStore {
  active: string;
  preferences: Record<string, WorkspacePreferences>;
}

export interface UseWorkspacesResult {
  activeWorkspace: string;
  setActiveWorkspace: (workspaceId: string) => void;
  getWorkspacePreferences: (workspaceId?: string) => WorkspacePreferences;
  updateWorkspacePreferences: (
    workspaceId: string,
    updater: (previous: WorkspacePreferences) => WorkspacePreferences | null,
  ) => void;
}

export const DEFAULT_WORKSPACE_ID = 'default';

const EMPTY_PREFERENCES: WorkspacePreferences = Object.freeze({}) as WorkspacePreferences;

const isWorkspacePreferences = (value: unknown): value is WorkspacePreferences => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.entries(value as Record<string, unknown>).every(([key, val]) => {
    if (key === 'evidencePanelOpen') {
      return typeof val === 'boolean';
    }
    return true;
  });
};

const isWorkspaceStore = (value: unknown): value is WorkspaceStore => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { active?: unknown; preferences?: unknown };
  if (typeof candidate.active !== 'string') {
    return false;
  }
  if (typeof candidate.preferences !== 'object' || candidate.preferences === null) {
    return false;
  }
  return Object.values(candidate.preferences as Record<string, unknown>).every(isWorkspacePreferences);
};

const shallowEqual = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => Object.is(a[key], b[key]));
};

const defaultStore = (): WorkspaceStore => ({
  active: DEFAULT_WORKSPACE_ID,
  preferences: {},
});

const normalizeWorkspaceId = (workspaceId?: string) => {
  const trimmed = (workspaceId ?? '').trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_WORKSPACE_ID;
};

const useWorkspaces = (): UseWorkspacesResult => {
  const [store, setStore] = usePersistentState<WorkspaceStore>(
    'workspace-preferences',
    defaultStore,
    isWorkspaceStore,
  );

  const activeWorkspace = store.active || DEFAULT_WORKSPACE_ID;

  const setActiveWorkspace = useCallback(
    (workspaceId: string) => {
      const id = normalizeWorkspaceId(workspaceId);
      setStore((previous) => {
        if (previous.active === id) {
          return previous;
        }
        return {
          ...previous,
          active: id,
        };
      });
    },
    [setStore],
  );

  const getWorkspacePreferences = useCallback(
    (workspaceId?: string) => {
      const id = normalizeWorkspaceId(workspaceId ?? activeWorkspace);
      return store.preferences[id] ?? EMPTY_PREFERENCES;
    },
    [store.preferences, activeWorkspace],
  );

  const updateWorkspacePreferences = useCallback(
    (
      workspaceId: string,
      updater: (previous: WorkspacePreferences) => WorkspacePreferences | null,
    ) => {
      const id = normalizeWorkspaceId(workspaceId);
      setStore((previous) => {
        const current = previous.preferences[id];
        const draft = current ? { ...current } : {};
        const updated = updater(draft);
        if (updated === current || (updated && current && shallowEqual(updated, current))) {
          return previous;
        }
        if (!updated || Object.keys(updated).length === 0) {
          if (!current) {
            return previous;
          }
          const { [id]: _removed, ...rest } = previous.preferences;
          return {
            ...previous,
            preferences: rest,
          };
        }
        if (!isWorkspacePreferences(updated)) {
          return previous;
        }
        return {
          ...previous,
          preferences: {
            ...previous.preferences,
            [id]: updated,
          },
        };
      });
    },
    [setStore],
  );

  return {
    activeWorkspace,
    setActiveWorkspace,
    getWorkspacePreferences,
    updateWorkspacePreferences,
  };
};

export default useWorkspaces;
