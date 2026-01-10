'use client';

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { SnapRect, SnapType } from '../utils/windowSnap';

export type WindowDisplayState = 'normal' | 'minimized' | 'maximized' | 'snapped';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowSnapState {
  type: SnapType;
  rect: SnapRect;
}

export interface WindowDescriptor {
  id: string;
  title: string;
  icon?: string;
  bounds: WindowBounds;
  prevBounds: WindowBounds | null;
  state: WindowDisplayState;
  snap?: WindowSnapState | null;
  z: number;
  active: boolean;
  resizable: boolean;
  draggable: boolean;
  minWidth: number;
  minHeight: number;
}

export type NewWindowDescriptor = Omit<WindowDescriptor, 'z' | 'active'> & {
  z?: number;
  active?: boolean;
};

interface WindowState {
  windows: Record<string, WindowDescriptor>;
  order: string[];
  activeId: string | null;
  nextZ: number;
}

const initialState: WindowState = {
  windows: {},
  order: [],
  activeId: null,
  nextZ: 10,
};

export type WindowAction =
  | { type: 'OPEN'; win: NewWindowDescriptor }
  | { type: 'CLOSE'; id: string }
  | { type: 'FOCUS'; id: string }
  | { type: 'SET_BOUNDS'; id: string; bounds: WindowBounds }
  | { type: 'UPDATE'; id: string; update: Partial<WindowDescriptor> };

function reduceWindows(state: WindowState, action: WindowAction): WindowState {
  switch (action.type) {
    case 'OPEN': {
      const { win } = action;
      const id = win.id;
      const z = state.nextZ + 1;
      const descriptor: WindowDescriptor = {
        ...win,
        z,
        active: true,
      };
      const nextWindows: Record<string, WindowDescriptor> = { ...state.windows };
      nextWindows[id] = descriptor;
      const order = [...state.order.filter((entry) => entry !== id), id];
      const normalizedWindows = Object.fromEntries(
        Object.entries(nextWindows).map(([key, value]) => [key, { ...value, active: key === id }]),
      );
      return {
        windows: normalizedWindows,
        order,
        activeId: id,
        nextZ: z,
      };
    }
    case 'CLOSE': {
      const { id } = action;
      if (!state.windows[id]) return state;
      const { [id]: _discarded, ...rest } = state.windows;
      const order = state.order.filter((entry) => entry !== id);
      const activeId = state.activeId === id ? null : state.activeId;
      return {
        windows: rest,
        order,
        activeId,
        nextZ: state.nextZ,
      };
    }
    case 'FOCUS': {
      const { id } = action;
      if (!state.windows[id]) return state;
      const z = state.nextZ + 1;
      const windows = Object.fromEntries(
        Object.entries(state.windows).map(([key, value]) => {
          if (key === id) {
            return [key, { ...value, z, active: true }];
          }
          return [key, { ...value, active: false }];
        }),
      );
      const order = [...state.order.filter((entry) => entry !== id), id];
      return {
        windows,
        order,
        activeId: id,
        nextZ: z,
      };
    }
    case 'SET_BOUNDS': {
      const { id, bounds } = action;
      const existing = state.windows[id];
      if (!existing) return state;
      const windows = {
        ...state.windows,
        [id]: { ...existing, bounds },
      };
      return { ...state, windows };
    }
    case 'UPDATE': {
      const { id, update } = action;
      const existing = state.windows[id];
      if (!existing) return state;
      const windows = {
        ...state.windows,
        [id]: { ...existing, ...update },
      };
      return { ...state, windows };
    }
    default:
      return state;
  }
}

interface WindowManagerContextValue extends WindowState {
  dispatch: React.Dispatch<WindowAction>;
  openInitial: () => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | undefined>(undefined);

const initialWindows: NewWindowDescriptor[] = [
  {
    id: 'win-notes',
    title: 'Notes',
    bounds: { x: 80, y: 96, width: 560, height: 380 },
    prevBounds: null,
    state: 'normal',
    snap: null,
    resizable: true,
    draggable: true,
    minWidth: 320,
    minHeight: 200,
  },
  {
    id: 'win-terminal',
    title: 'Terminal',
    bounds: { x: 360, y: 160, width: 640, height: 420 },
    prevBounds: null,
    state: 'normal',
    snap: null,
    resizable: true,
    draggable: true,
    minWidth: 360,
    minHeight: 240,
  },
];

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceWindows, initialState);

  const openInitial = useCallback(() => {
    if (Object.keys(state.windows).length > 0) return;
    initialWindows.forEach((descriptor) => {
      dispatch({ type: 'OPEN', win: descriptor });
    });
  }, [state.windows]);

  const value = useMemo<WindowManagerContextValue>(
    () => ({ ...state, dispatch, openInitial }),
    [state, dispatch, openInitial],
  );

  return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowManagerProvider');
  }
  return context;
}
