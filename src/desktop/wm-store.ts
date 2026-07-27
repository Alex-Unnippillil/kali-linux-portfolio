export type WinId = string;
export type WsId = string;

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WinSnapshot = {
  id: WinId;
  ws: WsId;
  bounds: Rect;
  minimized: boolean;
  isFocused: boolean;
  isVisible: boolean;
  z: number;
  meta?: Record<string, unknown>;
};

export type WmState = {
  ws: WsId;
  wins: Record<WinId, WinSnapshot>;
  zCtr: number;
};

type Subscriber = (state: Readonly<WmState>) => void;

type BoundsUpdate = Partial<Rect>;

type SpawnConfig = {
  id?: WinId;
  ws?: WsId;
  bounds?: Rect;
  minimized?: boolean;
  meta?: Record<string, unknown>;
};

const DEFAULT_WS: WsId = "default";
const DEFAULT_BOUNDS: Rect = { x: 96, y: 96, width: 640, height: 480 };

let state: WmState = {
  ws: DEFAULT_WS,
  wins: {},
  zCtr: 0,
};

const subscribers = new Set<Subscriber>();
let idSeed = 0;

const emit = () => {
  const snapshot = state;
  subscribers.forEach((listener) => listener(snapshot));
};

const updateState = (producer: (prev: WmState) => WmState) => {
  const next = producer(state);
  if (next === state) {
    return;
  }
  state = next;
  emit();
};

const cloneWins = (wins: Record<WinId, WinSnapshot>) => {
  const next: Record<WinId, WinSnapshot> = {};
  for (const [id, win] of Object.entries(wins)) {
    next[id] = { ...win, bounds: { ...win.bounds } };
  }
  return next;
};

const ensureWorkspaceState = (
  wins: Record<WinId, WinSnapshot>,
  activeWs: WsId,
  focusOverride?: WinId,
) => {
  let focusId = focusOverride;

  if (focusId && (!wins[focusId] || wins[focusId].ws !== activeWs || wins[focusId].minimized)) {
    focusId = undefined;
  }

  if (!focusId) {
    const top = Object.values(wins)
      .filter((win) => win.ws === activeWs && !win.minimized)
      .sort((a, b) => b.z - a.z)[0];
    focusId = top?.id;
  }

  const nextWins: Record<WinId, WinSnapshot> = {};
  for (const [id, win] of Object.entries(wins)) {
    const isFocused = id === focusId;
    nextWins[id] = {
      ...win,
      isFocused,
      isVisible: win.ws === activeWs && !win.minimized,
    };
  }

  return nextWins;
};

const nextWinId = () => {
  idSeed += 1;
  return `win-${Date.now().toString(36)}-${idSeed.toString(36)}`;
};

const get = () => state;

const subscribe = (listener: Subscriber) => {
  subscribers.add(listener);
  listener(state);
  return () => {
    subscribers.delete(listener);
  };
};

const focus = (id: WinId) => {
  const target = state.wins[id];
  if (!target) {
    return;
  }

  updateState((prev) => {
    const nextZ = prev.zCtr + 1;
    const wins = cloneWins(prev.wins);

    const targetWin = wins[id];
    if (!targetWin) {
      return prev;
    }

    for (const [winId, win] of Object.entries(wins)) {
      wins[winId] = {
        ...win,
        minimized: winId === id ? false : win.minimized,
        z: winId === id ? nextZ : win.z,
      };
    }

    const normalized = ensureWorkspaceState(wins, wins[id].ws, id);

    return {
      ws: wins[id].ws,
      wins: normalized,
      zCtr: nextZ,
    };
  });
};

const spawn = (config: SpawnConfig = {}) => {
  updateState((prev) => {
    const providedId = config.id ?? nextWinId();
    const nextZ = prev.zCtr + 1;
    const wins = cloneWins(prev.wins);
    const existing = wins[providedId];
    const ws = config.ws ?? existing?.ws ?? prev.ws;
    const bounds = config.bounds ?? existing?.bounds ?? { ...DEFAULT_BOUNDS };
    const minimized = config.minimized ?? false;

    wins[providedId] = {
      id: providedId,
      ws,
      bounds,
      minimized,
      isFocused: true,
      isVisible: true,
      z: nextZ,
      meta: config.meta ?? existing?.meta,
    };

    const normalized = ensureWorkspaceState(wins, ws, minimized ? undefined : providedId);

    return {
      ws,
      wins: normalized,
      zCtr: nextZ,
    };
  });
};

const setBounds = (id: WinId, bounds: BoundsUpdate) => {
  if (!bounds || Object.keys(bounds).length === 0) {
    return;
  }

  updateState((prev) => {
    const win = prev.wins[id];
    if (!win) {
      return prev;
    }

    const nextBounds = { ...win.bounds, ...bounds };
    const boundsChanged =
      nextBounds.x !== win.bounds.x ||
      nextBounds.y !== win.bounds.y ||
      nextBounds.width !== win.bounds.width ||
      nextBounds.height !== win.bounds.height;

    if (!boundsChanged) {
      return prev;
    }

    const wins = cloneWins(prev.wins);
    wins[id] = {
      ...wins[id],
      bounds: nextBounds,
    };

    const normalized = ensureWorkspaceState(wins, prev.ws, wins[id].isFocused ? id : undefined);

    return {
      ...prev,
      wins: normalized,
    };
  });
};

const minimize = (id: WinId, value = true) => {
  updateState((prev) => {
    const win = prev.wins[id];
    if (!win || win.minimized === value) {
      return prev;
    }

    const wins = cloneWins(prev.wins);
    wins[id] = {
      ...wins[id],
      minimized: value,
    };

    const normalized = ensureWorkspaceState(wins, prev.ws, value ? undefined : wins[id].isFocused ? id : undefined);

    return {
      ...prev,
      wins: normalized,
    };
  });
};

const close = (id: WinId) => {
  if (!state.wins[id]) {
    return;
  }

  updateState((prev) => {
    if (!prev.wins[id]) {
      return prev;
    }

    const wins = cloneWins(prev.wins);
    delete wins[id];

    const normalized = ensureWorkspaceState(wins, prev.ws);

    return {
      ...prev,
      wins: normalized,
    };
  });
};

const setWs = (ws: WsId) => {
  if (state.ws === ws) {
    return;
  }

  updateState((prev) => {
    if (prev.ws === ws) {
      return prev;
    }

    const normalized = ensureWorkspaceState(prev.wins, ws);

    return {
      ...prev,
      ws,
      wins: normalized,
    };
  });
};

export const wm = {
  get,
  subscribe,
  focus,
  spawn,
  setBounds,
  minimize,
  close,
  setWs,
};

export type { SpawnConfig, BoundsUpdate };
