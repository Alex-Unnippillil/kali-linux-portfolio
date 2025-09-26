export type WindowStoreEntry = {
  id: string;
  title?: string;
  icon?: string;
  minimized?: boolean;
  closed?: boolean;
  preview?: string | null;
};

type WindowStoreState = {
  order: string[];
  focusedId: string | null;
  windows: Record<string, WindowStoreEntry>;
};

type Listener = (state: WindowStoreState) => void;

const listeners = new Set<Listener>();

let state: WindowStoreState = {
  order: [],
  focusedId: null,
  windows: {},
};

const emit = () => {
  listeners.forEach((listener) => listener(state));
};

const setState = (updater: (prev: WindowStoreState) => WindowStoreState) => {
  state = updater(state);
  emit();
};

const mergeEntry = (
  previous: WindowStoreEntry | undefined,
  next: WindowStoreEntry,
): WindowStoreEntry => ({
  id: next.id,
  title: next.title ?? previous?.title ?? next.id,
  icon: next.icon ?? previous?.icon,
  minimized: next.minimized ?? previous?.minimized ?? false,
  closed: next.closed ?? previous?.closed ?? false,
  preview: next.preview ?? previous?.preview ?? null,
});

const reset = () => {
  state = {
    order: [],
    focusedId: null,
    windows: {},
  };
  emit();
};

const registerWindow = (
  entry: WindowStoreEntry,
  options: { touchOrder?: boolean } = {},
) => {
  setState((prev) => {
    const windows = { ...prev.windows };
    const merged = mergeEntry(prev.windows[entry.id], entry);
    windows[entry.id] = merged;

    let order = prev.order;
    if (merged.closed) {
      order = order.filter((id) => id !== entry.id);
    } else if (!order.includes(entry.id)) {
      order =
        options.touchOrder === false
          ? [...order, entry.id]
          : [entry.id, ...order];
    } else if (options.touchOrder) {
      order = [entry.id, ...order.filter((id) => id !== entry.id)];
    }

    let focusedId = prev.focusedId;
    if (merged.closed && focusedId === entry.id) {
      focusedId = order[0] ?? null;
    }

    return {
      order,
      focusedId,
      windows,
    };
  });
};

const focusWindow = (id: string) => {
  setState((prev) => {
    const existing = prev.windows[id];
    if (!existing || existing.closed) return prev;
    const windows = {
      ...prev.windows,
      [id]: {
        ...existing,
        minimized: false,
        closed: false,
      },
    };
    const order = [id, ...prev.order.filter((key) => key !== id)];
    return {
      ...prev,
      windows,
      order,
      focusedId: id,
    };
  });
};

const setMinimized = (id: string, minimized: boolean) => {
  setState((prev) => {
    const existing = prev.windows[id];
    if (!existing) return prev;
    const windows = {
      ...prev.windows,
      [id]: {
        ...existing,
        minimized,
      },
    };
    return {
      ...prev,
      windows,
    };
  });
};

const removeWindow = (id: string) => {
  setState((prev) => {
    if (!prev.windows[id]) return prev;
    const windows = { ...prev.windows };
    delete windows[id];
    const order = prev.order.filter((item) => item !== id);
    const focusedId = prev.focusedId === id ? order[0] ?? null : prev.focusedId;
    return {
      order,
      focusedId,
      windows,
    };
  });
};

const setPreview = (id: string, preview: string | null) => {
  setState((prev) => {
    const existing = prev.windows[id];
    if (!existing) return prev;
    const windows = {
      ...prev.windows,
      [id]: {
        ...existing,
        preview,
      },
    };
    return {
      ...prev,
      windows,
    };
  });
};

const getWindows = () =>
  state.order
    .map((id) => state.windows[id])
    .filter((entry): entry is WindowStoreEntry => Boolean(entry) && !entry.closed);

const cycleFocus = (direction: number, currentId?: string | null) => {
  const ordered = getWindows();
  if (!ordered.length) return null;

  const visible = ordered.filter((entry) => !entry.minimized);
  const pool = visible.length ? visible : ordered;
  if (!pool.length) return null;

  const startId =
    currentId && pool.some((entry) => entry.id === currentId)
      ? currentId
      : pool[0].id;
  const startIndex = pool.findIndex((entry) => entry.id === startId);
  const nextIndex = (startIndex + direction + pool.length) % pool.length;
  return pool[nextIndex]?.id ?? null;
};

const getState = () => state;

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const windowStore = {
  reset,
  registerWindow,
  removeWindow,
  focusWindow,
  setMinimized,
  setPreview,
  getWindows,
  cycleFocus,
  getState,
  subscribe,
};
