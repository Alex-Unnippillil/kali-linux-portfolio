"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { safeLocalStorage } from "../utils/safeStorage";

export type ColorFilter =
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "grayscale";

interface AccessibilityState {
  hoverLensEnabled: boolean;
  fullScreenMagnifierEnabled: boolean;
  hoverZoom: number;
  fullscreenZoom: number;
  filters: ColorFilter[];
}

export interface VisualAssistShortcut {
  id:
    | "hoverLens"
    | "fullScreenMagnifier"
    | "protanopia"
    | "deuteranopia"
    | "tritanopia"
    | "grayscale";
  combo: string;
  description: string;
}

interface AccessibilityPrefsValue {
  hoverLensEnabled: boolean;
  fullScreenMagnifierEnabled: boolean;
  hoverZoom: number;
  fullscreenZoom: number;
  activeFilters: ColorFilter[];
  filterStyle: string;
  toggleHoverLens: () => void;
  toggleFullscreenMagnifier: () => void;
  setHoverZoom: (zoom: number) => void;
  setFullscreenZoom: (zoom: number) => void;
  toggleFilter: (filter: ColorFilter) => void;
  isFilterActive: (filter: ColorFilter) => boolean;
  reset: () => void;
  shortcuts: VisualAssistShortcut[];
}

export const ACCESSIBILITY_PREFS_STORAGE_KEY = "visual-assist-preferences";
export const HOVER_ZOOM_MIN = 1.5;
export const HOVER_ZOOM_MAX = 4;
export const FULLSCREEN_ZOOM_MIN = 1;
export const FULLSCREEN_ZOOM_MAX = 3;

const defaultState: AccessibilityState = {
  hoverLensEnabled: false,
  fullScreenMagnifierEnabled: false,
  hoverZoom: 2,
  fullscreenZoom: 1.5,
  filters: [],
};

const filterOrder: ColorFilter[] = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "grayscale",
];

const COLOR_FILTER_MAP: Record<ColorFilter, string> = {
  protanopia: "url(#va-filter-protanopia)",
  deuteranopia: "url(#va-filter-deuteranopia)",
  tritanopia: "url(#va-filter-tritanopia)",
  grayscale: "grayscale(1)",
};

const AccessibilityPrefsContext =
  createContext<AccessibilityPrefsValue | null>(null);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sanitizeFilters = (filters: unknown): ColorFilter[] => {
  if (!Array.isArray(filters)) return [];
  const unique = new Set<ColorFilter>();
  filters.forEach((item) => {
    if (filterOrder.includes(item as ColorFilter)) {
      unique.add(item as ColorFilter);
    }
  });
  return filterOrder.filter((filter) => unique.has(filter));
};

const readStoredState = (): AccessibilityState => {
  if (!safeLocalStorage) return defaultState;
  try {
    const raw = safeLocalStorage.getItem(ACCESSIBILITY_PREFS_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AccessibilityState>;
    return {
      hoverLensEnabled:
        typeof parsed.hoverLensEnabled === "boolean"
          ? parsed.hoverLensEnabled
          : defaultState.hoverLensEnabled,
      fullScreenMagnifierEnabled:
        typeof parsed.fullScreenMagnifierEnabled === "boolean"
          ? parsed.fullScreenMagnifierEnabled
          : defaultState.fullScreenMagnifierEnabled,
      hoverZoom:
        typeof parsed.hoverZoom === "number"
          ? clamp(parsed.hoverZoom, HOVER_ZOOM_MIN, HOVER_ZOOM_MAX)
          : defaultState.hoverZoom,
      fullscreenZoom:
        typeof parsed.fullscreenZoom === "number"
          ? clamp(
              parsed.fullscreenZoom,
              FULLSCREEN_ZOOM_MIN,
              FULLSCREEN_ZOOM_MAX,
            )
          : defaultState.fullscreenZoom,
      filters: sanitizeFilters(parsed.filters),
    };
  } catch (error) {
    console.error("Failed to read accessibility prefs", error);
    return defaultState;
  }
};

const useAccessibilityPrefsState = (): AccessibilityPrefsValue => {
  const [state, setState] = useState<AccessibilityState>(defaultState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    const stored = readStoredState();
    setState(stored);
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || !safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(
        ACCESSIBILITY_PREFS_STORAGE_KEY,
        JSON.stringify(state),
      );
    } catch (error) {
      console.error("Failed to persist accessibility prefs", error);
    }
  }, [state]);

  const toggleHoverLens = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hoverLensEnabled: !prev.hoverLensEnabled,
    }));
  }, []);

  const toggleFullscreenMagnifier = useCallback(() => {
    setState((prev) => ({
      ...prev,
      fullScreenMagnifierEnabled: !prev.fullScreenMagnifierEnabled,
    }));
  }, []);

  const setHoverZoom = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      hoverZoom: clamp(zoom, HOVER_ZOOM_MIN, HOVER_ZOOM_MAX),
    }));
  }, []);

  const setFullscreenZoom = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      fullscreenZoom: clamp(
        zoom,
        FULLSCREEN_ZOOM_MIN,
        FULLSCREEN_ZOOM_MAX,
      ),
    }));
  }, []);

  const toggleFilter = useCallback((filter: ColorFilter) => {
    setState((prev) => {
      const exists = prev.filters.includes(filter);
      return {
        ...prev,
        filters: exists
          ? prev.filters.filter((entry) => entry !== filter)
          : [...prev.filters, filter],
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.removeItem(ACCESSIBILITY_PREFS_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to reset accessibility prefs", error);
    }
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey || !event.shiftKey) return;
      const key = event.key.toLowerCase();
      switch (key) {
        case "l":
          event.preventDefault();
          toggleHoverLens();
          break;
        case "m":
          event.preventDefault();
          toggleFullscreenMagnifier();
          break;
        case "1":
          event.preventDefault();
          toggleFilter("protanopia");
          break;
        case "2":
          event.preventDefault();
          toggleFilter("deuteranopia");
          break;
        case "3":
          event.preventDefault();
          toggleFilter("tritanopia");
          break;
        case "g":
          event.preventDefault();
          toggleFilter("grayscale");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleFilter, toggleFullscreenMagnifier, toggleHoverLens]);

  const filterStyle = useMemo(() => {
    if (!state.filters.length) return "none";
    return state.filters
      .map((filter) => COLOR_FILTER_MAP[filter])
      .join(" ");
  }, [state.filters]);

  const shortcuts = useMemo<VisualAssistShortcut[]>(
    () => [
      {
        id: "hoverLens",
        combo: "Alt+Shift+L",
        description: "Toggle hover lens",
      },
      {
        id: "fullScreenMagnifier",
        combo: "Alt+Shift+M",
        description: "Toggle full-screen magnifier",
      },
      {
        id: "protanopia",
        combo: "Alt+Shift+1",
        description: "Toggle protanopia filter",
      },
      {
        id: "deuteranopia",
        combo: "Alt+Shift+2",
        description: "Toggle deuteranopia filter",
      },
      {
        id: "tritanopia",
        combo: "Alt+Shift+3",
        description: "Toggle tritanopia filter",
      },
      {
        id: "grayscale",
        combo: "Alt+Shift+G",
        description: "Toggle grayscale filter",
      },
    ],
    [],
  );

  const value = useMemo<AccessibilityPrefsValue>(
    () => ({
      hoverLensEnabled: state.hoverLensEnabled,
      fullScreenMagnifierEnabled: state.fullScreenMagnifierEnabled,
      hoverZoom: state.hoverZoom,
      fullscreenZoom: state.fullscreenZoom,
      activeFilters: state.filters,
      filterStyle,
      toggleHoverLens,
      toggleFullscreenMagnifier,
      setHoverZoom,
      setFullscreenZoom,
      toggleFilter,
      isFilterActive: (filter: ColorFilter) => state.filters.includes(filter),
      reset,
      shortcuts,
    }),
    [
      filterStyle,
      reset,
      setFullscreenZoom,
      setHoverZoom,
      shortcuts,
      state.filters,
      state.fullScreenMagnifierEnabled,
      state.fullscreenZoom,
      state.hoverLensEnabled,
      state.hoverZoom,
      toggleFilter,
      toggleFullscreenMagnifier,
      toggleHoverLens,
    ],
  );

  return value;
};

export const AccessibilityPrefsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const value = useAccessibilityPrefsState();
  return (
    <AccessibilityPrefsContext.Provider value={value}>
      {children}
    </AccessibilityPrefsContext.Provider>
  );
};

export const useAccessibilityPrefs = () => {
  const context = useContext(AccessibilityPrefsContext);
  if (!context) {
    throw new Error(
      "useAccessibilityPrefs must be used within an AccessibilityPrefsProvider",
    );
  }
  return context;
};

export const getFilterStyle = (filters: ColorFilter[]) => {
  if (!filters.length) return "none";
  return filters.map((filter) => COLOR_FILTER_MAP[filter]).join(" ");
};
