"use client";

import { useCallback, useEffect, useMemo } from 'react';
import usePersistentState from './usePersistentState';
import {
  DesktopGroup,
  DesktopWindow,
  DesktopWindowSeed,
  GroupId,
  WorkspaceId,
  WorkspaceSnapshot,
  WorkspaceState,
  WindowBounds,
  WindowId,
} from '../types/desktop';

const STORAGE_KEY = 'desktop-workspaces';
export const DEFAULT_WORKSPACE_ID: WorkspaceId = 'workspace-main';

const defaultBounds: WindowBounds = { x: 160, y: 120, width: 720, height: 480 };

const createWorkspace = (id: WorkspaceId, name: string): WorkspaceSnapshot => ({
  id,
  name,
  windows: {},
  windowOrder: [],
  groups: {},
  groupOrder: [],
});

const initialState: WorkspaceState = {
  activeWorkspaceId: DEFAULT_WORKSPACE_ID,
  workspaces: {
    [DEFAULT_WORKSPACE_ID]: createWorkspace(DEFAULT_WORKSPACE_ID, 'Workspace 1'),
  },
};

function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== 'object') return false;
  const state = value as WorkspaceState;
  if (typeof state.activeWorkspaceId !== 'string' || typeof state.workspaces !== 'object') {
    return false;
  }
  return true;
}

const cloneWorkspace = (workspace: WorkspaceSnapshot): WorkspaceSnapshot => ({
  ...workspace,
  windows: Object.fromEntries(
    Object.entries(workspace.windows).map(([id, win]) => [
      id,
      {
        ...win,
        bounds: { ...win.bounds },
      },
    ]),
  ),
  windowOrder: [...workspace.windowOrder],
  groups: Object.fromEntries(
    Object.entries(workspace.groups).map(([id, group]) => [
      id,
      {
        ...group,
        windowIds: [...group.windowIds],
      },
    ]),
  ),
  groupOrder: [...workspace.groupOrder],
});

const syncWindowOrdering = (workspace: WorkspaceSnapshot) => {
  workspace.windowOrder = workspace.windowOrder.filter((id) => workspace.windows[id]);
  workspace.windowOrder.forEach((id, index) => {
    const win = workspace.windows[id];
    if (win) {
      win.order = index;
      win.zIndex = index;
    }
  });
};

const detachWindowFromGroup = (workspace: WorkspaceSnapshot, windowId: WindowId) => {
  const win = workspace.windows[windowId];
  if (!win || !win.groupId) return;
  const group = workspace.groups[win.groupId];
  if (group) {
    group.windowIds = group.windowIds.filter((id) => id !== windowId);
    if (group.windowIds.length === 0) {
      delete workspace.groups[group.id];
      workspace.groupOrder = workspace.groupOrder.filter((id) => id !== group.id);
    }
  }
  win.groupId = null;
  win.groupIndex = null;
};

const syncGroupOrdering = (workspace: WorkspaceSnapshot) => {
  const seen = new Set<GroupId>();
  workspace.groupOrder = workspace.groupOrder.filter((id) => workspace.groups[id]);
  workspace.groupOrder = workspace.groupOrder.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  Object.values(workspace.groups).forEach((group) => {
    group.windowIds = group.windowIds.filter((id) => workspace.windows[id]);
  });

  workspace.groupOrder.forEach((groupId, idx) => {
    const group = workspace.groups[groupId];
    if (!group) return;
    group.order = idx;
    group.windowIds.forEach((windowId, windowIdx) => {
      const win = workspace.windows[windowId];
      if (win) {
        win.groupId = group.id;
        win.groupIndex = windowIdx;
      }
    });
  });

  Object.values(workspace.windows).forEach((win) => {
    if (!win.groupId || !workspace.groups[win.groupId]) {
      win.groupId = null;
      win.groupIndex = null;
    }
  });
};

const createDesktopGroup = (
  id: GroupId,
  name: string,
  order: number,
  windowIds: WindowId[] = [],
): DesktopGroup => ({
  id,
  name,
  order,
  windowIds: [...windowIds],
  createdAt: Date.now(),
});

const buildWindow = (seed: DesktopWindowSeed, order: number): DesktopWindow => ({
  id: seed.id,
  appId: seed.appId,
  title: seed.title,
  icon: seed.icon,
  bounds: {
    x: seed.bounds?.x ?? defaultBounds.x,
    y: seed.bounds?.y ?? defaultBounds.y,
    width: seed.bounds?.width ?? defaultBounds.width,
    height: seed.bounds?.height ?? defaultBounds.height,
  },
  groupId: seed.groupId ?? null,
  groupIndex: null,
  order,
  zIndex: order,
  isMinimized: seed.isMinimized ?? false,
  createdAt: Date.now(),
});

const generateGroupId = () => `group-${Math.random().toString(36).slice(2, 10)}`;

const ensureUniqueWindows = (workspace: WorkspaceSnapshot, ids: WindowId[]) =>
  Array.from(new Set(ids.filter((id) => !!workspace.windows[id])));

interface WorkspaceStore {
  state: WorkspaceState;
  activeWorkspace: WorkspaceSnapshot;
  activeWorkspaceId: WorkspaceId;
  setActiveWorkspace: (workspaceId: WorkspaceId, name?: string) => void;
  openWindow: (seed: DesktopWindowSeed) => DesktopWindow;
  closeWindow: (windowId: WindowId) => void;
  focusWindow: (windowId: WindowId) => void;
  moveWindowToGroup: (windowId: WindowId, groupId: GroupId | null, index?: number) => void;
  createGroup: (name: string, windowIds?: WindowId[]) => DesktopGroup | null;
  renameGroup: (groupId: GroupId, name: string) => void;
  dissolveGroup: (groupId: GroupId) => void;
  moveGroup: (groupId: GroupId, targetIndex: number) => void;
}

export default function useWorkspaceStore(): WorkspaceStore {
  const [state, setState] = usePersistentState<WorkspaceState>(
    STORAGE_KEY,
    initialState,
    isWorkspaceState,
  );

  useEffect(() => {
    setState((prev) => {
      if (prev.activeWorkspaceId && prev.workspaces[prev.activeWorkspaceId]) return prev;
      return {
        ...prev,
        activeWorkspaceId: DEFAULT_WORKSPACE_ID,
        workspaces: {
          ...prev.workspaces,
          [DEFAULT_WORKSPACE_ID]: prev.workspaces[DEFAULT_WORKSPACE_ID] ?? createWorkspace(DEFAULT_WORKSPACE_ID, 'Workspace 1'),
        },
      };
    });
  }, [setState]);

  const withWorkspace = useCallback(
    <T,>(workspaceId: WorkspaceId, updater: (workspace: WorkspaceSnapshot) => T): T => {
      let payload: T | undefined;
      setState((prev) => {
        const current = prev.workspaces[workspaceId] ?? createWorkspace(
          workspaceId,
          `Workspace ${Object.keys(prev.workspaces).length + (prev.workspaces[workspaceId] ? 0 : 1)}`,
        );
        const clone = cloneWorkspace(current);
        payload = updater(clone);
        return {
          ...prev,
          workspaces: {
            ...prev.workspaces,
            [workspaceId]: clone,
          },
        };
      });
      return payload as T;
    },
    [setState],
  );

  const activeWorkspaceId = state.activeWorkspaceId;
  const activeWorkspace = useMemo(() => {
    const workspace = state.workspaces[activeWorkspaceId];
    return workspace ? cloneWorkspace(workspace) : createWorkspace(activeWorkspaceId, 'Workspace');
  }, [state.workspaces, activeWorkspaceId]);

  const setActiveWorkspace = useCallback(
    (workspaceId: WorkspaceId, name?: string) => {
      setState((prev) => {
        if (prev.activeWorkspaceId === workspaceId && prev.workspaces[workspaceId]) {
          return prev;
        }
        const hasWorkspace = !!prev.workspaces[workspaceId];
        return {
          ...prev,
          activeWorkspaceId: workspaceId,
          workspaces: hasWorkspace
            ? prev.workspaces
            : {
                ...prev.workspaces,
                [workspaceId]: createWorkspace(
                  workspaceId,
                  name ?? `Workspace ${Object.keys(prev.workspaces).length + 1}`,
                ),
              },
        };
      });
    },
    [setState],
  );

  const openWindow = useCallback(
    (seed: DesktopWindowSeed): DesktopWindow =>
      withWorkspace(activeWorkspaceId, (workspace) => {
        const existing = workspace.windows[seed.id];
        if (existing) {
          existing.title = seed.title ?? existing.title;
          if (seed.icon !== undefined) existing.icon = seed.icon;
          if (seed.bounds) {
            existing.bounds = {
              ...existing.bounds,
              ...seed.bounds,
            };
          }
          return existing;
        }

        const next = buildWindow(seed, workspace.windowOrder.length);
        workspace.windows[next.id] = next;
        workspace.windowOrder.push(next.id);
        syncWindowOrdering(workspace);

        if (next.groupId) {
          const group = workspace.groups[next.groupId];
          if (group) {
            group.windowIds.push(next.id);
          } else {
            const newGroup = createDesktopGroup(next.groupId, next.groupId, workspace.groupOrder.length, [next.id]);
            workspace.groups[newGroup.id] = newGroup;
            workspace.groupOrder.push(newGroup.id);
          }
          syncGroupOrdering(workspace);
        }

        return next;
      }),
    [withWorkspace, activeWorkspaceId],
  );

  const closeWindow = useCallback(
    (windowId: WindowId) => {
      withWorkspace(activeWorkspaceId, (workspace) => {
        if (!workspace.windows[windowId]) return;
        detachWindowFromGroup(workspace, windowId);
        delete workspace.windows[windowId];
        workspace.windowOrder = workspace.windowOrder.filter((id) => id !== windowId);
        syncWindowOrdering(workspace);
        syncGroupOrdering(workspace);
      });
    },
    [withWorkspace, activeWorkspaceId],
  );

  const focusWindow = useCallback(
    (windowId: WindowId) => {
      withWorkspace(activeWorkspaceId, (workspace) => {
        if (!workspace.windowOrder.includes(windowId)) return;
        workspace.windowOrder = workspace.windowOrder.filter((id) => id !== windowId);
        workspace.windowOrder.push(windowId);
        syncWindowOrdering(workspace);
      });
    },
    [withWorkspace, activeWorkspaceId],
  );

  const moveWindowToGroup = useCallback(
    (windowId: WindowId, groupId: GroupId | null, index?: number) => {
      withWorkspace(activeWorkspaceId, (workspace) => {
        const win = workspace.windows[windowId];
        if (!win) return;
        detachWindowFromGroup(workspace, windowId);
        if (groupId === null) {
          syncGroupOrdering(workspace);
          return;
        }
        const group = workspace.groups[groupId];
        if (!group) return;
        const insertIndex = index === undefined ? group.windowIds.length : Math.max(0, Math.min(index, group.windowIds.length));
        if (group.windowIds.includes(windowId)) {
          const currentIndex = group.windowIds.indexOf(windowId);
          group.windowIds.splice(currentIndex, 1);
          group.windowIds.splice(insertIndex, 0, windowId);
        } else {
          group.windowIds.splice(insertIndex, 0, windowId);
        }
        syncGroupOrdering(workspace);
      });
    },
    [withWorkspace, activeWorkspaceId],
  );

  const createGroup = useCallback(
    (name: string, windowIds: WindowId[] = []): DesktopGroup | null =>
      withWorkspace(activeWorkspaceId, (workspace) => {
        const id = generateGroupId();
        const cleanedName = name.trim() || `Group ${workspace.groupOrder.length + 1}`;
        const uniqueWindows = ensureUniqueWindows(workspace, windowIds);
        const group = createDesktopGroup(id, cleanedName, workspace.groupOrder.length, uniqueWindows);
        workspace.groups[id] = group;
        workspace.groupOrder.push(id);
        uniqueWindows.forEach((windowId, idx) => {
          detachWindowFromGroup(workspace, windowId);
          const win = workspace.windows[windowId];
          if (win) {
            win.groupId = id;
            win.groupIndex = idx;
          }
        });
        syncGroupOrdering(workspace);
        return workspace.groups[id] ?? null;
      }),
    [withWorkspace, activeWorkspaceId],
  );

  const renameGroup = useCallback(
    (groupId: GroupId, name: string) => {
      withWorkspace(activeWorkspaceId, (workspace) => {
        const group = workspace.groups[groupId];
        if (!group) return;
        const trimmed = name.trim();
        if (trimmed) {
          group.name = trimmed;
        }
      });
    },
    [withWorkspace, activeWorkspaceId],
  );

  const dissolveGroup = useCallback(
    (groupId: GroupId) => {
      withWorkspace(activeWorkspaceId, (workspace) => {
        const group = workspace.groups[groupId];
        if (!group) return;
        group.windowIds.forEach((windowId) => {
          const win = workspace.windows[windowId];
          if (win) {
            win.groupId = null;
            win.groupIndex = null;
          }
        });
        delete workspace.groups[groupId];
        workspace.groupOrder = workspace.groupOrder.filter((id) => id !== groupId);
        syncGroupOrdering(workspace);
      });
    },
    [withWorkspace, activeWorkspaceId],
  );

  const moveGroup = useCallback(
    (groupId: GroupId, targetIndex: number) => {
      withWorkspace(activeWorkspaceId, (workspace) => {
        const currentIndex = workspace.groupOrder.indexOf(groupId);
        if (currentIndex === -1) return;
        const boundedTarget = Math.max(0, Math.min(targetIndex, workspace.groupOrder.length));
        workspace.groupOrder.splice(currentIndex, 1);
        const insertIndex = boundedTarget >= workspace.groupOrder.length ? workspace.groupOrder.length : boundedTarget;
        workspace.groupOrder.splice(insertIndex, 0, groupId);
        syncGroupOrdering(workspace);
      });
    },
    [withWorkspace, activeWorkspaceId],
  );

  return {
    state,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspace,
    openWindow,
    closeWindow,
    focusWindow,
    moveWindowToGroup,
    createGroup,
    renameGroup,
    dissolveGroup,
    moveGroup,
  };
}
