"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const DEFAULT_STORAGE_KEY = "desktop_window_sizes";
const PERSIST_DEBOUNCE_MS = 180;
const BOUNDS_EVENT_NAMES = [
  "window-bounds-changed",
  "window-bounds-committed",
  "window-bounds-commit",
];

const noop = () => {};

const getLocalStorage = () => {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch (error) {
    return undefined;
  }
};

const normalizeBounds = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value.bounds && typeof value.bounds === "object" ? value.bounds : value;
  const width = Number(source.width);
  const height = Number(source.height);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return {
    width,
    height,
  };
};

const normalizeBoundsMap = (map) => {
  if (!map || typeof map !== "object") {
    return {};
  }

  const normalized = {};
  Object.entries(map).forEach(([id, value]) => {
    if (!id) return;
    const bounds = normalizeBounds(value);
    if (bounds) {
      normalized[id] = bounds;
    }
  });
  return normalized;
};

const mergeBoundsMaps = (base, overrides) => {
  const result = { ...base };
  Object.entries(overrides || {}).forEach(([id, value]) => {
    if (!id) return;
    const bounds = normalizeBounds(value);
    if (bounds) {
      result[id] = bounds;
    }
  });
  return result;
};

const areBoundsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.width === b.width && a.height === b.height;
};

const areBoundsMapsEqual = (a, b) => {
  if (a === b) return true;
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (const key of aKeys) {
    if (!(key in (b || {}))) {
      return false;
    }
    if (!areBoundsEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
};

export const readStoredWindowBounds = (storageKey = DEFAULT_STORAGE_KEY) => {
  const storage = getLocalStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeBoundsMap(parsed);
  } catch (error) {
    return {};
  }
};

export const writeStoredWindowBounds = (value, storageKey = DEFAULT_STORAGE_KEY) => {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    const serialized = JSON.stringify(value || {});
    storage.setItem(storageKey, serialized);
  } catch (error) {
    // ignore write failures
  }
};

const extractEventPayload = (detail) => {
  if (!detail || typeof detail !== "object") {
    return { id: undefined, bounds: null };
  }

  const id =
    typeof detail.id === "string"
      ? detail.id
      : typeof detail.windowId === "string"
      ? detail.windowId
      : typeof detail.targetId === "string"
      ? detail.targetId
      : undefined;

  const candidate =
    (detail.bounds && typeof detail.bounds === "object" && detail.bounds) ||
    (detail.size && typeof detail.size === "object" && detail.size) ||
    (detail.dimensions && typeof detail.dimensions === "object" && detail.dimensions) || {
      width: detail.width,
      height: detail.height,
    };

  return { id, bounds: normalizeBounds(candidate) };
};

const WindowManagerContext = createContext({
  windowBounds: {},
  getWindowBounds: () => undefined,
  registerWindowBounds: noop,
  updateWindowBounds: noop,
  removeWindowBounds: noop,
});

export const useWindowManager = () => useContext(WindowManagerContext);

export function WindowManagerProvider({
  children,
  defaults = {},
  storageKey = DEFAULT_STORAGE_KEY,
}) {
  const normalizedDefaults = useMemo(() => normalizeBoundsMap(defaults), [defaults]);
  const [windowBounds, setWindowBounds] = useState(() => {
    const stored = readStoredWindowBounds(storageKey);
    return mergeBoundsMaps(normalizedDefaults, stored);
  });

  const latestBoundsRef = useRef(windowBounds);
  const persistTimeoutRef = useRef(null);
  const hydrationRef = useRef(false);

  const schedulePersist = useCallback(() => {
    if (typeof window === "undefined" || typeof window.setTimeout !== "function") {
      return;
    }
    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }
    persistTimeoutRef.current = window.setTimeout(() => {
      persistTimeoutRef.current = null;
      writeStoredWindowBounds(latestBoundsRef.current, storageKey);
    }, PERSIST_DEBOUNCE_MS);
  }, [storageKey]);

  useEffect(() => {
    latestBoundsRef.current = windowBounds;
    if (!hydrationRef.current) {
      hydrationRef.current = true;
      return;
    }
    schedulePersist();
  }, [windowBounds, schedulePersist]);

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        if (typeof window !== "undefined" && typeof window.clearTimeout === "function") {
          window.clearTimeout(persistTimeoutRef.current);
        } else {
          clearTimeout(persistTimeoutRef.current);
        }
      }
    };
  }, []);

  useEffect(() => {
    const stored = readStoredWindowBounds(storageKey);
    setWindowBounds((current) => {
      const merged = mergeBoundsMaps(normalizedDefaults, stored);
      if (areBoundsMapsEqual(current, merged)) {
        return current;
      }
      return merged;
    });
  }, [storageKey, normalizedDefaults]);

  useEffect(() => {
    if (!Object.keys(normalizedDefaults).length) return;
    setWindowBounds((current) => {
      const merged = mergeBoundsMaps(normalizedDefaults, current);
      if (areBoundsMapsEqual(current, merged)) {
        return current;
      }
      return merged;
    });
  }, [normalizedDefaults]);

  const registerWindowBounds = useCallback((id, bounds) => {
    const normalized = normalizeBounds(bounds);
    if (!id || !normalized) return;
    setWindowBounds((current) => {
      if (current[id]) {
        return current;
      }
      return {
        ...current,
        [id]: normalized,
      };
    });
  }, []);

  const updateWindowBounds = useCallback((id, bounds) => {
    const normalized = normalizeBounds(bounds);
    if (!id || !normalized) return;
    setWindowBounds((current) => {
      const existing = current[id];
      if (existing && areBoundsEqual(existing, normalized)) {
        return current;
      }
      return {
        ...current,
        [id]: normalized,
      };
    });
  }, []);

  const removeWindowBounds = useCallback((id) => {
    if (!id) return;
    setWindowBounds((current) => {
      if (!(id in current)) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const getWindowBounds = useCallback((id) => windowBounds[id], [windowBounds]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handler = (event) => {
      const detail = event && typeof event === "object" ? event.detail : undefined;
      const { id, bounds } = extractEventPayload(detail);
      if (!id || !bounds) return;
      updateWindowBounds(id, bounds);
    };

    BOUNDS_EVENT_NAMES.forEach((eventName) => {
      window.addEventListener(eventName, handler);
    });

    return () => {
      BOUNDS_EVENT_NAMES.forEach((eventName) => {
        window.removeEventListener(eventName, handler);
      });
    };
  }, [updateWindowBounds]);

  const contextValue = useMemo(
    () => ({
      windowBounds,
      getWindowBounds,
      registerWindowBounds,
      updateWindowBounds,
      removeWindowBounds,
    }),
    [windowBounds, getWindowBounds, registerWindowBounds, updateWindowBounds, removeWindowBounds],
  );

  return (
    <WindowManagerContext.Provider value={contextValue}>
      {children}
    </WindowManagerContext.Provider>
  );
}

WindowManagerProvider.defaultProps = {
  defaults: {},
  storageKey: DEFAULT_STORAGE_KEY,
};

export default WindowManagerProvider;
