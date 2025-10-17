"use client";

import React from "react";

const BASE_Z_INDEX = 200;

type Registry = Record<string, number>;

type State = {
  next: number;
  registry: Registry;
};

type Action =
  | { type: "REGISTER"; id: string }
  | { type: "UNREGISTER"; id: string }
  | { type: "FOCUS"; id: string };

type DesktopZIndexContextValue = {
  baseZIndex: number;
  registerWindow: (id: string) => void;
  unregisterWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  getZIndex: (id: string | null | undefined) => number;
};

const noop = () => {};

const defaultContext: DesktopZIndexContextValue = {
  baseZIndex: BASE_Z_INDEX,
  registerWindow: noop,
  unregisterWindow: noop,
  focusWindow: noop,
  getZIndex: () => BASE_Z_INDEX,
};

const DesktopZIndexContext = React.createContext<DesktopZIndexContextValue>(defaultContext);

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "REGISTER": {
      const id = action.id;
      if (!id || state.registry[id]) {
        return state;
      }
      const nextValue = state.next + 1;
      return {
        next: nextValue,
        registry: {
          ...state.registry,
          [id]: nextValue,
        },
      };
    }
    case "FOCUS": {
      const id = action.id;
      if (!id) {
        return state;
      }
      const current = state.registry[id];
      if (current && current === state.next) {
        return state;
      }
      const nextValue = state.next + 1;
      return {
        next: nextValue,
        registry: {
          ...state.registry,
          [id]: nextValue,
        },
      };
    }
    case "UNREGISTER": {
      const id = action.id;
      if (!id || !state.registry[id]) {
        return state;
      }
      const { [id]: _removed, ...rest } = state.registry;
      return {
        next: state.next,
        registry: rest,
      };
    }
    default:
      return state;
  }
};

const initialState: State = {
  next: BASE_Z_INDEX,
  registry: {},
};

export const DesktopZIndexProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const registerWindow = React.useCallback((id: string) => {
    dispatch({ type: "REGISTER", id });
  }, []);

  const unregisterWindow = React.useCallback((id: string) => {
    dispatch({ type: "UNREGISTER", id });
  }, []);

  const focusWindow = React.useCallback((id: string) => {
    dispatch({ type: "FOCUS", id });
  }, []);

  const getZIndex = React.useCallback(
    (id: string | null | undefined) => {
      if (!id) {
        return BASE_Z_INDEX;
      }
      return state.registry[id] ?? BASE_Z_INDEX;
    },
    [state.registry],
  );

  const value = React.useMemo(
    () => ({
      baseZIndex: BASE_Z_INDEX,
      registerWindow,
      unregisterWindow,
      focusWindow,
      getZIndex,
    }),
    [registerWindow, unregisterWindow, focusWindow, getZIndex],
  );

  return <DesktopZIndexContext.Provider value={value}>{children}</DesktopZIndexContext.Provider>;
};

export const useDesktopZIndex = () => React.useContext(DesktopZIndexContext);
