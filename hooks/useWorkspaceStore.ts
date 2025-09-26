"use client";

import { useSyncExternalStore } from "react";

export interface WorkspaceDescriptor {
  id: number;
  label: string;
}

export interface WorkspaceState extends WorkspaceDescriptor {
  windows: string[];
  focusedWindowId: string | null;
}

export interface WorkspaceStoreState {
  activeWorkspaceId: number;
  previousWorkspaceId: number | null;
  workspaces: WorkspaceState[];
}

type WorkspaceSelector<T> = (state: WorkspaceStoreState) => T;

type WorkspaceStoreListener = () => void;

const listeners = new Set<WorkspaceStoreListener>();

let state: WorkspaceStoreState = {
  activeWorkspaceId: 0,
  previousWorkspaceId: null,
  workspaces: [],
};

function notify() {
  listeners.forEach((listener) => listener());
}

function nextState(next: WorkspaceStoreState) {
  state = next;
  notify();
}

function updateState(
  updater: (prev: WorkspaceStoreState) => WorkspaceStoreState,
) {
  nextState(updater(state));
}

function subscribe(listener: WorkspaceStoreListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function ensureWorkspaces(count: number, descriptors?: WorkspaceDescriptor[]) {
  return Array.from({ length: count }, (_, index) => {
    const descriptor = descriptors?.[index];
    return {
      id: descriptor?.id ?? index,
      label: descriptor?.label ?? `Workspace ${index + 1}`,
      windows: [] as string[],
      focusedWindowId: null,
    } satisfies WorkspaceState;
  });
}

export function configureWorkspaceStore(
  descriptors: WorkspaceDescriptor[],
  activeWorkspaceId = 0,
) {
  updateState(() => ({
    activeWorkspaceId,
    previousWorkspaceId: null,
    workspaces: ensureWorkspaces(descriptors.length, descriptors),
  }));
}

export function resetWorkspaceStore() {
  updateState((prev) => ({
    activeWorkspaceId: 0,
    previousWorkspaceId: null,
    workspaces: ensureWorkspaces(prev.workspaces.length || 4),
  }));
}

export function getWorkspaceSnapshot(): WorkspaceStoreState {
  return state;
}

export function useWorkspaceStore<T>(
  selector: WorkspaceSelector<T> = (value) => value as T,
): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

function detachWindow(
  workspaces: WorkspaceState[],
  windowId: string,
): WorkspaceState[] {
  return workspaces.map((workspace) => {
    if (!workspace.windows.includes(windowId)) {
      return workspace;
    }
    const remaining = workspace.windows.filter((id) => id !== windowId);
    const focusedWindowId =
      workspace.focusedWindowId === windowId
        ? remaining[remaining.length - 1] ?? null
        : workspace.focusedWindowId;
    if (
      remaining.length === workspace.windows.length &&
      focusedWindowId === workspace.focusedWindowId
    ) {
      return workspace;
    }
    return {
      ...workspace,
      windows: remaining,
      focusedWindowId,
    };
  });
}

export function addWindowToWorkspace(windowId: string, workspaceId?: number) {
  updateState((prev) => {
    const targetId =
      workspaceId !== undefined ? workspaceId : prev.activeWorkspaceId;
    const workspaces = detachWindow(prev.workspaces, windowId).map(
      (workspace) => {
        if (workspace.id !== targetId) {
          return workspace;
        }
        if (workspace.windows.includes(windowId)) {
          if (workspace.focusedWindowId === windowId) {
            return workspace;
          }
          return { ...workspace, focusedWindowId: windowId };
        }
        return {
          ...workspace,
          windows: [...workspace.windows, windowId],
          focusedWindowId: windowId,
        };
      },
    );

    return {
      ...prev,
      workspaces,
    };
  });
}

export function focusWorkspaceWindow(windowId: string) {
  updateState((prev) => {
    let ownerId = prev.activeWorkspaceId;
    for (const workspace of prev.workspaces) {
      if (workspace.windows.includes(windowId)) {
        ownerId = workspace.id;
        break;
      }
    }
    const workspaces = prev.workspaces.map((workspace) => {
      if (!workspace.windows.includes(windowId)) {
        if (workspace.focusedWindowId === windowId) {
          return { ...workspace, focusedWindowId: null };
        }
        return workspace;
      }
      if (workspace.focusedWindowId === windowId) {
        return workspace;
      }
      return { ...workspace, focusedWindowId: windowId };
    });
    return {
      ...prev,
      activeWorkspaceId: ownerId,
      workspaces,
    };
  });
}

export function removeWindowFromWorkspace(windowId: string) {
  updateState((prev) => ({
    ...prev,
    workspaces: detachWindow(prev.workspaces, windowId),
  }));
}

export function setActiveWorkspace(workspaceId: number) {
  updateState((prev) => {
    if (prev.activeWorkspaceId === workspaceId) {
      return prev;
    }
    if (!prev.workspaces.some((workspace) => workspace.id === workspaceId)) {
      return prev;
    }
    return {
      ...prev,
      previousWorkspaceId: prev.activeWorkspaceId,
      activeWorkspaceId: workspaceId,
    };
  });
}

export function moveWindowToWorkspace(
  windowId: string,
  targetWorkspaceId: number,
  options: { activateTarget?: boolean } = {},
) {
  updateState((prev) => {
    if (!prev.workspaces.some((workspace) => workspace.id === targetWorkspaceId)) {
      return prev;
    }
    const workspaces = detachWindow(prev.workspaces, windowId).map(
      (workspace) => {
        if (workspace.id !== targetWorkspaceId) {
          return workspace;
        }
        const windows = workspace.windows.includes(windowId)
          ? workspace.windows
          : [...workspace.windows, windowId];
        return {
          ...workspace,
          windows,
          focusedWindowId: windowId,
        };
      },
    );
    return {
      ...prev,
      previousWorkspaceId: options.activateTarget
        ? prev.activeWorkspaceId
        : prev.previousWorkspaceId,
      activeWorkspaceId: options.activateTarget
        ? targetWorkspaceId
        : prev.activeWorkspaceId,
      workspaces,
    };
  });
}

export function getWorkspaceForWindow(windowId: string) {
  return state.workspaces.find((workspace) =>
    workspace.windows.includes(windowId),
  );
}
