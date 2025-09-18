"use client";

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { safeLocalStorage } from '../utils/safeStorage';

export interface VirtualDesktop {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface VirtualDesktopsState {
  desktops: VirtualDesktop[];
  activeDesktopId: string;
  windowAssignments: Record<string, string>;
}

export type VirtualDesktopsAction =
  | { type: 'SET_ACTIVE'; desktopId: string }
  | { type: 'REORDER'; sourceId: string; targetId: string }
  | { type: 'ASSIGN_WINDOW'; windowId: string; desktopId: string }
  | { type: 'UNASSIGN_WINDOW'; windowId: string }
  | { type: 'RENAME'; desktopId: string; name: string }
  | { type: 'SET_ICON'; desktopId: string; icon: string };

export const STORAGE_KEY = 'virtual-desktops-state';

export const DEFAULT_DESKTOPS: VirtualDesktop[] = [
  {
    id: 'desktop-1',
    name: 'Workspace 1',
    icon: '/themes/Yaru/system/user-desktop.png',
    order: 0,
  },
  {
    id: 'desktop-2',
    name: 'Workspace 2',
    icon: '/themes/Yaru/system/user-desktop.png',
    order: 1,
  },
];

const normaliseDesktops = (desktops: Partial<VirtualDesktop>[]): VirtualDesktop[] =>
  desktops
    .filter(
      (desktop): desktop is VirtualDesktop =>
        Boolean(desktop)
        && typeof desktop.id === 'string'
        && typeof desktop.name === 'string'
        && typeof desktop.icon === 'string',
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((desktop, index) => ({ ...desktop, order: index }));

const ensureKnownAssignments = (
  assignments: Record<string, string> | undefined,
  desktops: VirtualDesktop[],
) => {
  if (!assignments) return {} as Record<string, string>;
  const knownIds = new Set(desktops.map((desktop) => desktop.id));
  return Object.entries(assignments).reduce<Record<string, string>>((acc, [windowId, desktopId]) => {
    if (typeof windowId === 'string' && knownIds.has(desktopId)) {
      acc[windowId] = desktopId;
    }
    return acc;
  }, {});
};

export const createInitialState = (): VirtualDesktopsState => ({
  desktops: normaliseDesktops(DEFAULT_DESKTOPS),
  activeDesktopId: DEFAULT_DESKTOPS[0]?.id ?? 'desktop-1',
  windowAssignments: {},
});

const hydrateState = (): VirtualDesktopsState => {
  if (!safeLocalStorage) {
    return createInitialState();
  }
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw) as Partial<VirtualDesktopsState> | undefined;
    if (!parsed || typeof parsed !== 'object') {
      return createInitialState();
    }
    const desktops = normaliseDesktops(parsed.desktops ?? []);
    if (!desktops.length) {
      return createInitialState();
    }
    const activeDesktopId = desktops.some((desktop) => desktop.id === parsed.activeDesktopId)
      ? (parsed.activeDesktopId as string)
      : desktops[0].id;
    return {
      desktops,
      activeDesktopId,
      windowAssignments: ensureKnownAssignments(parsed.windowAssignments, desktops),
    };
  } catch {
    return createInitialState();
  }
};

export const virtualDesktopsReducer = (
  state: VirtualDesktopsState,
  action: VirtualDesktopsAction,
): VirtualDesktopsState => {
  switch (action.type) {
    case 'SET_ACTIVE': {
      if (state.activeDesktopId === action.desktopId) {
        return state;
      }
      const exists = state.desktops.some((desktop) => desktop.id === action.desktopId);
      if (!exists) {
        return state;
      }
      return { ...state, activeDesktopId: action.desktopId };
    }
    case 'REORDER': {
      if (action.sourceId === action.targetId) {
        return state;
      }
      const desktops = [...state.desktops].sort((a, b) => a.order - b.order);
      const fromIndex = desktops.findIndex((desktop) => desktop.id === action.sourceId);
      const toIndex = desktops.findIndex((desktop) => desktop.id === action.targetId);
      if (fromIndex === -1 || toIndex === -1) {
        return state;
      }
      const updated = [...desktops];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return {
        ...state,
        desktops: updated.map((desktop, index) => ({ ...desktop, order: index })),
      };
    }
    case 'ASSIGN_WINDOW': {
      const exists = state.desktops.some((desktop) => desktop.id === action.desktopId);
      if (!exists) {
        return state;
      }
      if (state.windowAssignments[action.windowId] === action.desktopId) {
        return state;
      }
      return {
        ...state,
        windowAssignments: {
          ...state.windowAssignments,
          [action.windowId]: action.desktopId,
        },
      };
    }
    case 'UNASSIGN_WINDOW': {
      if (!(action.windowId in state.windowAssignments)) {
        return state;
      }
      const { [action.windowId]: _removed, ...rest } = state.windowAssignments;
      return {
        ...state,
        windowAssignments: rest,
      };
    }
    case 'RENAME': {
      const name = action.name.trim();
      if (!name) {
        return state;
      }
      let changed = false;
      const desktops = state.desktops.map((desktop) => {
        if (desktop.id === action.desktopId && desktop.name !== name) {
          changed = true;
          return { ...desktop, name };
        }
        return desktop;
      });
      if (!changed) {
        return state;
      }
      return { ...state, desktops };
    }
    case 'SET_ICON': {
      const icon = action.icon.trim();
      if (!icon) {
        return state;
      }
      let changed = false;
      const desktops = state.desktops.map((desktop) => {
        if (desktop.id === action.desktopId && desktop.icon !== icon) {
          changed = true;
          return { ...desktop, icon };
        }
        return desktop;
      });
      if (!changed) {
        return state;
      }
      return { ...state, desktops };
    }
    default:
      return state;
  }
};

export interface VirtualDesktopManager {
  desktops: VirtualDesktop[];
  activeDesktopId: string;
  windowAssignments: Record<string, string>;
  setActiveDesktop: (desktopId: string) => void;
  reorderDesktops: (sourceId: string, targetId: string) => void;
  moveWindowToDesktop: (windowId: string, desktopId: string) => void;
  removeWindowAssignment: (windowId: string) => void;
  getWindowDesktopId: (windowId: string) => string | undefined;
  ensureWindowOnDesktop: (windowId: string, desktopId?: string) => void;
  renameDesktop: (desktopId: string, name: string) => void;
  setDesktopIcon: (desktopId: string, icon: string) => void;
}

const getWindowDesktopIdFromState = (
  state: VirtualDesktopsState,
  desktops: VirtualDesktop[],
  windowId: string,
) => {
  const assigned = state.windowAssignments[windowId];
  if (assigned && desktops.some((desktop) => desktop.id === assigned)) {
    return assigned;
  }
  return undefined;
};

const storeState = (state: VirtualDesktopsState) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore write errors to preserve UX in private mode
  }
};

const useVirtualDesktops = (): VirtualDesktopManager => {
  const [state, dispatch] = useReducer(virtualDesktopsReducer, undefined, hydrateState);

  const desktops = useMemo(
    () => [...state.desktops].sort((a, b) => a.order - b.order),
    [state.desktops],
  );

  useEffect(() => {
    storeState(state);
  }, [state]);

  const setActiveDesktop = useCallback((desktopId: string) => {
    dispatch({ type: 'SET_ACTIVE', desktopId });
  }, []);

  const reorderDesktops = useCallback((sourceId: string, targetId: string) => {
    dispatch({ type: 'REORDER', sourceId, targetId });
  }, []);

  const moveWindowToDesktop = useCallback((windowId: string, desktopId: string) => {
    dispatch({ type: 'ASSIGN_WINDOW', windowId, desktopId });
  }, []);

  const removeWindowAssignment = useCallback((windowId: string) => {
    dispatch({ type: 'UNASSIGN_WINDOW', windowId });
  }, []);

  const ensureWindowOnDesktop = useCallback(
    (windowId: string, desktopId?: string) => {
      const targetDesktopId = desktopId
        || getWindowDesktopIdFromState(state, desktops, windowId)
        || state.activeDesktopId;
      if (!desktops.some((desktop) => desktop.id === targetDesktopId)) {
        return;
      }
      dispatch({ type: 'ASSIGN_WINDOW', windowId, desktopId: targetDesktopId });
    },
    [desktops, state],
  );

  const renameDesktop = useCallback((desktopId: string, name: string) => {
    dispatch({ type: 'RENAME', desktopId, name });
  }, []);

  const setDesktopIcon = useCallback((desktopId: string, icon: string) => {
    dispatch({ type: 'SET_ICON', desktopId, icon });
  }, []);

  const getWindowDesktopId = useCallback(
    (windowId: string) => getWindowDesktopIdFromState(state, desktops, windowId),
    [state, desktops],
  );

  return {
    desktops,
    activeDesktopId: state.activeDesktopId,
    windowAssignments: state.windowAssignments,
    setActiveDesktop,
    reorderDesktops,
    moveWindowToDesktop,
    removeWindowAssignment,
    getWindowDesktopId,
    ensureWindowOnDesktop,
    renameDesktop,
    setDesktopIcon,
  };
};

export default useVirtualDesktops;
