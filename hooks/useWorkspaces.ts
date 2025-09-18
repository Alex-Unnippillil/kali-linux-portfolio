'use client';

import { useCallback, useEffect, useMemo } from 'react';
import usePersistentState from './usePersistentState';
import logger from '../utils/logger';

export interface WorkspaceProfile {
  id: string;
  name: string;
  apps: string[];
}

export interface WorkspaceImportConflict {
  original: string;
  resolved: string;
}

export interface WorkspaceImportResult {
  success: boolean;
  message: string;
  imported: number;
  conflicts: WorkspaceImportConflict[];
}

export interface CreateWorkspaceResult {
  success: boolean;
  profile?: WorkspaceProfile;
  reason?: 'empty' | 'duplicate';
}

const WORKSPACE_STORAGE_KEY = 'desktop-workspaces';
const ACTIVE_STORAGE_KEY = 'desktop-workspaces-active';

const DEFAULT_WORKSPACE: WorkspaceProfile = {
  id: 'workspace-default',
  name: 'Default Workspace',
  apps: [],
};

const sanitizeApps = (apps: unknown): string[] => {
  if (!Array.isArray(apps)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of apps) {
    if (typeof entry === 'string' && !seen.has(entry)) {
      seen.add(entry);
      result.push(entry);
    }
  }
  return result;
};

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ws-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isWorkspaceProfile = (value: unknown): value is WorkspaceProfile => {
  if (!value || typeof value !== 'object') return false;
  const profile = value as WorkspaceProfile;
  return (
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    Array.isArray(profile.apps) &&
    profile.apps.every((app) => typeof app === 'string')
  );
};

const isWorkspaceArray = (value: unknown): value is WorkspaceProfile[] =>
  Array.isArray(value) && value.every(isWorkspaceProfile);

const ensureDefaultWorkspace = (value: WorkspaceProfile[]): WorkspaceProfile[] =>
  value.length === 0 ? [DEFAULT_WORKSPACE] : value;

export default function useWorkspaces() {
  const [profiles, setProfiles] = usePersistentState<WorkspaceProfile[]>(
    WORKSPACE_STORAGE_KEY,
    () => [DEFAULT_WORKSPACE],
    isWorkspaceArray,
  );

  const [activeId, setActiveId] = usePersistentState<string>(
    ACTIVE_STORAGE_KEY,
    () => DEFAULT_WORKSPACE.id,
    (value): value is string => typeof value === 'string',
  );

  useEffect(() => {
    setProfiles((current) => ensureDefaultWorkspace(current));
  }, [setProfiles]);

  useEffect(() => {
    if (!profiles.some((profile) => profile.id === activeId) && profiles.length) {
      setActiveId(profiles[0].id);
    }
  }, [profiles, activeId, setActiveId]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeId) ?? profiles[0],
    [profiles, activeId],
  );

  const createWorkspace = useCallback(
    (name: string): CreateWorkspaceResult => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { success: false, reason: 'empty' };
      }

      let created: WorkspaceProfile | undefined;
      setProfiles((current) => {
        if (
          current.some(
            (profile) => profile.name.toLowerCase() === trimmed.toLowerCase(),
          )
        ) {
          return current;
        }
        created = { id: generateId(), name: trimmed, apps: [] };
        return [...current, created];
      });

      if (created) {
        setActiveId(created.id);
        return { success: true, profile: created };
      }

      return { success: false, reason: 'duplicate' };
    },
    [setProfiles, setActiveId],
  );

  const switchWorkspace = useCallback(
    (id: string) => {
      if (profiles.some((profile) => profile.id === id)) {
        setActiveId(id);
      }
    },
    [profiles, setActiveId],
  );

  const setApps = useCallback(
    (apps: string[]) => {
      setProfiles((current) =>
        current.map((profile) =>
          profile.id === activeId
            ? { ...profile, apps: sanitizeApps(apps) }
            : profile,
        ),
      );
    },
    [activeId, setProfiles],
  );

  const toggleApp = useCallback(
    (appId: string) => {
      setProfiles((current) =>
        current.map((profile) => {
          if (profile.id !== activeId) return profile;
          const hasApp = profile.apps.includes(appId);
          const apps = hasApp
            ? profile.apps.filter((id) => id !== appId)
            : [...profile.apps, appId];
          return { ...profile, apps };
        }),
      );
    },
    [activeId, setProfiles],
  );

  const exportWorkspaces = useCallback(
    () =>
      JSON.stringify({
        version: 1,
        activeId,
        profiles: profiles.map(({ id, name, apps }) => ({ id, name, apps })),
      }),
    [profiles, activeId],
  );

  const importWorkspaces = useCallback(
    (payload: string): WorkspaceImportResult => {
      try {
        const parsed = JSON.parse(payload);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid workspace payload');
        }

        const rawProfiles = (parsed as { profiles?: unknown }).profiles;
        const importedActiveId = (parsed as { activeId?: unknown }).activeId;

        if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
          logger.error('Workspace import failed: empty payload', parsed);
          return {
            success: false,
            message: 'No workspaces were found in the provided backup.',
            imported: 0,
            conflicts: [],
          };
        }

        const existingNames = new Set(profiles.map((profile) => profile.name));
        const conflicts: WorkspaceImportConflict[] = [];
        const idMap = new Map<string, string>();

        const ensureUniqueName = (name: string) => {
          if (!existingNames.has(name)) {
            existingNames.add(name);
            return name;
          }
          let suffix = 1;
          let candidate = `${name} (Imported)`;
          while (existingNames.has(candidate)) {
            suffix += 1;
            candidate = `${name} (Imported ${suffix})`;
          }
          conflicts.push({ original: name, resolved: candidate });
          existingNames.add(candidate);
          return candidate;
        };

        const sanitized = rawProfiles.reduce<WorkspaceProfile[]>((acc, raw, index) => {
          if (!raw || typeof raw !== 'object') return acc;
          const workspace = raw as { id?: unknown; name?: unknown; apps?: unknown };
          const baseName =
            typeof workspace.name === 'string' && workspace.name.trim()
              ? workspace.name.trim()
              : `Imported Workspace ${index + 1}`;
          const name = ensureUniqueName(baseName);
          const id = generateId();
          if (typeof workspace.id === 'string') {
            idMap.set(workspace.id, id);
          }
          acc.push({ id, name, apps: sanitizeApps(workspace.apps) });
          return acc;
        }, []);

        if (sanitized.length === 0) {
          logger.error('Workspace import failed: nothing usable', parsed);
          return {
            success: false,
            message: 'No compatible workspaces found in the backup.',
            imported: 0,
            conflicts: [],
          };
        }

        const nextProfiles = [...profiles, ...sanitized];
        setProfiles(nextProfiles);

        const mappedActiveId =
          typeof importedActiveId === 'string'
            ? idMap.get(importedActiveId) ?? sanitized[0].id
            : sanitized[0].id;
        setActiveId(mappedActiveId);

        return {
          success: true,
          message: `Restored ${sanitized.length} workspace${
            sanitized.length > 1 ? 's' : ''
          }.`,
          imported: sanitized.length,
          conflicts,
        };
      } catch (error) {
        logger.error('Workspace import failed', error);
        return {
          success: false,
          message: 'Unable to restore workspaces. Please verify the backup file and try again.',
          imported: 0,
          conflicts: [],
        };
      }
    },
    [profiles, setProfiles, setActiveId],
  );

  return {
    profiles,
    activeProfile,
    activeId,
    createWorkspace,
    switchWorkspace,
    setApps,
    toggleApp,
    exportWorkspaces,
    importWorkspaces,
  } as const;
}
