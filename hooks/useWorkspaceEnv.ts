"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  EnvEntry,
  EnvMutationResult,
  KeyValidationResult,
  WorkspaceId,
  deleteKey,
  getActiveWorkspace,
  getEntries,
  getValue,
  setValue,
  subscribe,
  subscribeToWorkspace,
  validateKey,
} from '../utils/envStore';

interface UseWorkspaceEnvResult {
  workspaceId: WorkspaceId;
  entries: EnvEntry[];
  setEntry: (
    key: string,
    value: string,
    options?: { previousKey?: string },
  ) => EnvMutationResult;
  deleteEntry: (key: string) => EnvMutationResult;
  validateKey: (key: string) => KeyValidationResult;
  getEntryValue: (key: string) => string | undefined;
}

const DEFAULT_WORKSPACE_ID = 0;

export default function useWorkspaceEnv(targetWorkspaceId?: WorkspaceId): UseWorkspaceEnvResult {
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>(() => {
    if (typeof targetWorkspaceId === 'number') {
      return targetWorkspaceId;
    }
    return getActiveWorkspace();
  });

  const [entries, setEntries] = useState<EnvEntry[]>(() => getEntries(workspaceId));

  useEffect(() => {
    if (typeof targetWorkspaceId === 'number') {
      setWorkspaceId(targetWorkspaceId);
      setEntries(getEntries(targetWorkspaceId));
      return () => {};
    }

    const unsubscribe = subscribeToWorkspace((nextId) => {
      setWorkspaceId(nextId);
      setEntries(getEntries(nextId));
    });

    return unsubscribe;
  }, [targetWorkspaceId]);

  useEffect(() => {
    const id = typeof targetWorkspaceId === 'number' ? targetWorkspaceId : workspaceId;
    const unsubscribe = subscribe(id ?? DEFAULT_WORKSPACE_ID, (list) => {
      setEntries(list);
    });
    return unsubscribe;
  }, [workspaceId, targetWorkspaceId]);

  const setEntry = useMemo(
    () =>
      (key: string, value: string, options?: { previousKey?: string }): EnvMutationResult => {
        const id = typeof targetWorkspaceId === 'number' ? targetWorkspaceId : workspaceId;
        return setValue(id ?? DEFAULT_WORKSPACE_ID, key, value, options);
      },
    [workspaceId, targetWorkspaceId],
  );

  const deleteEntry = useMemo(
    () =>
      (key: string): EnvMutationResult => {
        const id = typeof targetWorkspaceId === 'number' ? targetWorkspaceId : workspaceId;
        return deleteKey(id ?? DEFAULT_WORKSPACE_ID, key);
      },
    [workspaceId, targetWorkspaceId],
  );

  const getEntryValue = useMemo(
    () =>
      (key: string): string | undefined => {
        const id = typeof targetWorkspaceId === 'number' ? targetWorkspaceId : workspaceId;
        return getValue(id ?? DEFAULT_WORKSPACE_ID, key);
      },
    [workspaceId, targetWorkspaceId],
  );

  return {
    workspaceId,
    entries,
    setEntry,
    deleteEntry,
    validateKey,
    getEntryValue,
  };
}
