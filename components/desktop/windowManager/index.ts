export type WindowState = "normal" | "minimized" | "maximized" | "snapped";

export type WindowBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ManagedWindow = {
  id: string;
  appKey: string;
  title: string;
  state: WindowState;
  bounds: WindowBounds;
  restoreBounds: WindowBounds | null;
  snapRegion?: string | null;
};

export type WindowManagerState = {
  windows: Record<string, ManagedWindow>;
  order: string[];
  activeId: string | null;
};

export type WindowManagerAction =
  | { type: "OPEN"; appKey: string; payload?: Partial<ManagedWindow> }
  | { type: "CLOSE"; id: string }
  | { type: "FOCUS"; id: string }
  | { type: "MOVE"; id: string; bounds: Partial<WindowBounds> }
  | { type: "RESIZE"; id: string; bounds: Partial<WindowBounds> }
  | { type: "MINIMIZE"; id: string }
  | { type: "MAXIMIZE"; id: string; bounds?: WindowBounds }
  | { type: "RESTORE"; id: string }
  | { type: "SNAP"; id: string; region: string; bounds: WindowBounds };

const normalizeBounds = (bounds: Partial<WindowBounds> | undefined, fallback: WindowBounds): WindowBounds => {
  const next = {
    x: typeof bounds?.x === "number" ? bounds.x : fallback.x,
    y: typeof bounds?.y === "number" ? bounds.y : fallback.y,
    w: typeof bounds?.w === "number" ? bounds.w : fallback.w,
    h: typeof bounds?.h === "number" ? bounds.h : fallback.h,
  };
  return next;
};

export const createWindowManagerState = (): WindowManagerState => ({
  windows: {},
  order: [],
  activeId: null,
});

const promoteOrder = (order: string[], id: string) => {
  const next = order.filter((item) => item !== id);
  next.push(id);
  return next;
};

const removeOrder = (order: string[], id: string) => order.filter((item) => item !== id);

export const windowManagerReducer = (
  state: WindowManagerState,
  action: WindowManagerAction,
): WindowManagerState => {
  switch (action.type) {
    case "OPEN": {
      const id = action.appKey;
      const existing = state.windows[id];
      const defaultBounds: WindowBounds = existing?.bounds || { x: 0, y: 0, w: 60, h: 70 };
      const merged = {
        id,
        appKey: id,
        title: action.payload?.title || existing?.title || id,
        state: action.payload?.state || existing?.state || "normal",
        bounds: normalizeBounds(action.payload?.bounds, defaultBounds),
        restoreBounds: action.payload?.restoreBounds || existing?.restoreBounds || null,
        snapRegion: action.payload?.snapRegion || existing?.snapRegion || null,
      } satisfies ManagedWindow;
      return {
        ...state,
        windows: {
          ...state.windows,
          [id]: merged,
        },
        order: promoteOrder(state.order, id),
        activeId: id,
      };
    }
    case "CLOSE": {
      if (!state.windows[action.id]) return state;
      const { [action.id]: _removed, ...rest } = state.windows;
      const nextOrder = removeOrder(state.order, action.id);
      return {
        ...state,
        windows: rest,
        order: nextOrder,
        activeId: state.activeId === action.id ? nextOrder[nextOrder.length - 1] || null : state.activeId,
      };
    }
    case "FOCUS": {
      if (!state.windows[action.id]) return state;
      return {
        ...state,
        order: promoteOrder(state.order, action.id),
        activeId: action.id,
        windows: {
          ...state.windows,
          [action.id]: {
            ...state.windows[action.id],
            state: state.windows[action.id].state === "minimized" ? "normal" : state.windows[action.id].state,
          },
        },
      };
    }
    case "MOVE": {
      const target = state.windows[action.id];
      if (!target) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            bounds: normalizeBounds(action.bounds, target.bounds),
          },
        },
      };
    }
    case "RESIZE": {
      const target = state.windows[action.id];
      if (!target) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            bounds: normalizeBounds(action.bounds, target.bounds),
          },
        },
      };
    }
    case "MINIMIZE": {
      const target = state.windows[action.id];
      if (!target) return state;
      const nextOrder = removeOrder(state.order, action.id);
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            state: "minimized",
          },
        },
        order: nextOrder,
        activeId: state.activeId === action.id ? nextOrder[nextOrder.length - 1] || null : state.activeId,
      };
    }
    case "MAXIMIZE": {
      const target = state.windows[action.id];
      if (!target) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            state: "maximized",
            restoreBounds: target.restoreBounds || target.bounds,
            bounds: action.bounds || target.bounds,
          },
        },
      };
    }
    case "RESTORE": {
      const target = state.windows[action.id];
      if (!target) return state;
      const restored = target.restoreBounds || target.bounds;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            state: "normal",
            bounds: restored,
            restoreBounds: null,
            snapRegion: null,
          },
        },
      };
    }
    case "SNAP": {
      const target = state.windows[action.id];
      if (!target) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            state: "snapped",
            restoreBounds: target.restoreBounds || target.bounds,
            bounds: action.bounds,
            snapRegion: action.region,
          },
        },
      };
    }
    default:
      return state;
  }
};
