'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { getLayerZIndex } from '../../utils/zIndexManager';

type OverlayDescriptor = {
  id: string;
  modal?: boolean;
  overlay?: boolean;
};

type OverlayEntry = {
  id: string;
  modal: boolean;
  overlay: boolean;
  open: boolean;
  minimized: boolean;
  focused: boolean;
};

type OverlaySnapshot = OverlayEntry & {
  order: number;
  zIndex: number;
};

type ManagerState = {
  overlays: Record<string, OverlayEntry>;
  stack: string[];
  focusedId: string | null;
};

type RegisterAction = {
  type: 'REGISTER';
  descriptor: OverlayDescriptor;
};

type UnregisterAction = {
  type: 'UNREGISTER';
  id: string;
};

type OpenAction = { type: 'OPEN'; id: string };
type CloseAction = { type: 'CLOSE'; id: string };
type MinimizeAction = { type: 'MINIMIZE'; id: string };
type RestoreAction = { type: 'RESTORE'; id: string };
type FocusAction = { type: 'FOCUS'; id: string };

type Action =
  | RegisterAction
  | UnregisterAction
  | OpenAction
  | CloseAction
  | MinimizeAction
  | RestoreAction
  | FocusAction;

const createDefaultOverlay = (id: string): OverlayEntry => ({
  id,
  modal: false,
  overlay: true,
  open: false,
  minimized: false,
  focused: false,
});

const initialState: ManagerState = {
  overlays: {},
  stack: [],
  focusedId: null,
};

const findLastActiveOverlay = (
  overlays: Record<string, OverlayEntry>,
  stack: string[],
  excludeId?: string,
): string | null => {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const id = stack[i];
    if (id === excludeId) continue;
    const entry = overlays[id];
    if (entry && entry.open && !entry.minimized) {
      return id;
    }
  }
  return null;
};

const applyFocus = (
  overlays: Record<string, OverlayEntry>,
  focusedId: string | null,
): Record<string, OverlayEntry> => {
  let changed = false;
  const next: Record<string, OverlayEntry> = {};
  Object.entries(overlays).forEach(([id, entry]) => {
    const shouldFocus = focusedId === id && entry.open && !entry.minimized;
    if (entry.focused !== shouldFocus) {
      changed = true;
      next[id] = { ...entry, focused: shouldFocus };
    } else {
      next[id] = entry;
    }
  });
  return changed ? next : overlays;
};

function reducer(state: ManagerState, action: Action): ManagerState {
  switch (action.type) {
    case 'REGISTER': {
      const { descriptor } = action;
      const id = descriptor.id;
      if (!id) return state;
      const previous = state.overlays[id];
      const base = previous ?? createDefaultOverlay(id);
      const modal = descriptor.modal ?? base.modal;
      const overlay = descriptor.overlay ?? base.overlay;
      if (
        previous &&
        previous.modal === modal &&
        previous.overlay === overlay
      ) {
        return state;
      }
      const overlays = {
        ...state.overlays,
        [id]: { ...base, modal, overlay },
      };
      const stack = base.open && !state.stack.includes(id)
        ? [...state.stack, id]
        : state.stack;
      return {
        overlays,
        stack,
        focusedId: state.focusedId,
      };
    }
    case 'UNREGISTER': {
      const { id } = action;
      if (!state.overlays[id]) return state;
      const overlays = { ...state.overlays };
      delete overlays[id];
      const stack = state.stack.filter((value) => value !== id);
      const fallback = findLastActiveOverlay(overlays, stack);
      const nextOverlays = applyFocus(overlays, fallback);
      return {
        overlays: nextOverlays,
        stack,
        focusedId: fallback,
      };
    }
    case 'OPEN': {
      const { id } = action;
      const previous = state.overlays[id] ?? createDefaultOverlay(id);
      if (previous.open && !previous.minimized && previous.focused) {
        const stack = state.stack.filter((value) => value !== id).concat(id);
        return {
          overlays: state.overlays,
          stack,
          focusedId: id,
        };
      }
      const overlays = {
        ...state.overlays,
        [id]: { ...previous, open: true, minimized: false },
      };
      const stack = state.stack.filter((value) => value !== id).concat(id);
      const nextOverlays = applyFocus(overlays, id);
      return {
        overlays: nextOverlays,
        stack,
        focusedId: id,
      };
    }
    case 'RESTORE': {
      const { id } = action;
      const previous = state.overlays[id] ?? createDefaultOverlay(id);
      const overlays = {
        ...state.overlays,
        [id]: { ...previous, open: true, minimized: false },
      };
      const stack = state.stack.filter((value) => value !== id).concat(id);
      const nextOverlays = applyFocus(overlays, id);
      return {
        overlays: nextOverlays,
        stack,
        focusedId: id,
      };
    }
    case 'MINIMIZE': {
      const { id } = action;
      const previous = state.overlays[id];
      if (!previous) return state;
      if (!previous.open && !previous.minimized) return state;
      const overlays = {
        ...state.overlays,
        [id]: { ...previous, minimized: true, open: true },
      };
      const fallback = findLastActiveOverlay(overlays, state.stack);
      const nextOverlays = applyFocus(overlays, fallback);
      return {
        overlays: nextOverlays,
        stack: state.stack,
        focusedId: fallback,
      };
    }
    case 'CLOSE': {
      const { id } = action;
      const previous = state.overlays[id];
      if (!previous) return state;
      if (!previous.open && !previous.minimized && !previous.focused) {
        return state;
      }
      const overlays = {
        ...state.overlays,
        [id]: { ...previous, open: false, minimized: false, focused: false },
      };
      const stack = state.stack.filter((value) => value !== id);
      const fallback = findLastActiveOverlay(overlays, stack);
      const nextOverlays = applyFocus(overlays, fallback);
      return {
        overlays: nextOverlays,
        stack,
        focusedId: fallback,
      };
    }
    case 'FOCUS': {
      const { id } = action;
      const entry = state.overlays[id];
      if (!entry || !entry.open || entry.minimized) {
        return state;
      }
      if (entry.focused && state.stack[state.stack.length - 1] === id) {
        return state;
      }
      const overlays = applyFocus(state.overlays, id);
      const stack = state.stack.filter((value) => value !== id).concat(id);
      return {
        overlays,
        stack,
        focusedId: id,
      };
    }
    default:
      return state;
  }
}

type OverlayManagerValue = {
  overlays: Record<string, OverlayEntry>;
  stack: string[];
  focusedId: string | null;
  registerOverlay: (descriptor: OverlayDescriptor) => void;
  unregisterOverlay: (id: string) => void;
  openOverlay: (id: string) => void;
  closeOverlay: (id: string) => void;
  minimizeOverlay: (id: string) => void;
  restoreOverlay: (id: string) => void;
  focusOverlay: (id: string) => void;
  getOverlaySnapshot: (id: string) => OverlaySnapshot | undefined;
};

const OverlayManagerContext = createContext<OverlayManagerValue | null>(null);

export const OverlayManagerProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { overlays, stack, focusedId } = state;

  const registerOverlay = useCallback(
    (descriptor: OverlayDescriptor) => {
      if (!descriptor.id) return;
      dispatch({ type: 'REGISTER', descriptor });
    },
    [],
  );

  const unregisterOverlay = useCallback((id: string) => {
    dispatch({ type: 'UNREGISTER', id });
  }, []);

  const openOverlay = useCallback((id: string) => {
    dispatch({ type: 'OPEN', id });
  }, []);

  const closeOverlay = useCallback((id: string) => {
    dispatch({ type: 'CLOSE', id });
  }, []);

  const minimizeOverlay = useCallback((id: string) => {
    dispatch({ type: 'MINIMIZE', id });
  }, []);

  const restoreOverlay = useCallback((id: string) => {
    dispatch({ type: 'RESTORE', id });
  }, []);

  const focusOverlay = useCallback((id: string) => {
    dispatch({ type: 'FOCUS', id });
  }, []);

  const getOverlaySnapshot = useCallback(
    (id: string): OverlaySnapshot | undefined => {
      const entry = overlays[id];
      if (!entry) return undefined;
      const order = stack.indexOf(id);
      const baseZ = getLayerZIndex('systemOverlay');
      const zIndex = order === -1 ? baseZ : baseZ + order + 1;
      return { ...entry, order, zIndex };
    },
    [overlays, stack],
  );

  const value = useMemo<OverlayManagerValue>(
    () => ({
      overlays,
      stack,
      focusedId,
      registerOverlay,
      unregisterOverlay,
      openOverlay,
      closeOverlay,
      minimizeOverlay,
      restoreOverlay,
      focusOverlay,
      getOverlaySnapshot,
    }),
    [
      overlays,
      stack,
      focusedId,
      registerOverlay,
      unregisterOverlay,
      openOverlay,
      closeOverlay,
      minimizeOverlay,
      restoreOverlay,
      focusOverlay,
      getOverlaySnapshot,
    ],
  );

  return (
    <OverlayManagerContext.Provider value={value}>
      {children}
    </OverlayManagerContext.Provider>
  );
};

export const useOverlayManager = (): OverlayManagerValue => {
  const context = useContext(OverlayManagerContext);
  if (!context) {
    throw new Error('useOverlayManager must be used within an OverlayManagerProvider');
  }
  return context;
};

export const useOverlayRegistration = ({
  id,
  modal,
  overlay,
}: OverlayDescriptor): void => {
  const { registerOverlay, unregisterOverlay } = useOverlayManager();

  useEffect(() => {
    if (!id) return;
    registerOverlay({ id, modal, overlay });
    return () => {
      unregisterOverlay(id);
    };
  }, [registerOverlay, unregisterOverlay, id, modal, overlay]);
};

export const useOverlaySnapshot = (id: string): OverlaySnapshot | undefined => {
  const { getOverlaySnapshot } = useOverlayManager();
  return getOverlaySnapshot(id);
};

export type { OverlaySnapshot };
