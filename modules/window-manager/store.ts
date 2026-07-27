"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

export type WindowId = string;

export interface WindowRecord {
  id: WindowId;
  appId: string;
  title: string;
  /**
   * True when the window has been minimized. Minimized windows should
   * still be considered running but are not marked as focused.
   */
  isMinimized: boolean;
  /**
   * True when the window currently has input focus.
   */
  isFocused: boolean;
}

export interface WindowManagerState {
  windows: Record<WindowId, WindowRecord>;
}

const defaultState: WindowManagerState = { windows: {} };

let state: WindowManagerState = { windows: {} };
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function setState(updater: (prev: WindowManagerState) => WindowManagerState) {
  const next = updater(state);
  if (next === state) return;
  state = next;
  notify();
}

function cloneWindows() {
  return { ...state.windows };
}

function compareRecords(a: WindowRecord, b: WindowRecord) {
  return (
    a.id === b.id &&
    a.appId === b.appId &&
    a.title === b.title &&
    a.isMinimized === b.isMinimized &&
    a.isFocused === b.isFocused
  );
}

export const windowManagerStore = {
  getState: () => state,
  getServerSnapshot: () => defaultState,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  openWindow(descriptor: Omit<WindowRecord, "isMinimized" | "isFocused"> & {
    isMinimized?: boolean;
    isFocused?: boolean;
  }) {
    setState((prev) => {
      const existing = prev.windows[descriptor.id];
      const nextRecord: WindowRecord = {
        id: descriptor.id,
        appId: descriptor.appId,
        title: descriptor.title,
        isMinimized: descriptor.isMinimized ?? false,
        isFocused: descriptor.isFocused ?? false,
      };

      if (existing && compareRecords(existing, nextRecord)) {
        return prev;
      }

      const windows = { ...prev.windows, [descriptor.id]: nextRecord };
      return { windows };
    });
  },
  closeWindow(id: WindowId) {
    setState((prev) => {
      if (!prev.windows[id]) return prev;
      const windows = cloneWindows();
      delete windows[id];
      return { windows };
    });
  },
  focusWindow(id: WindowId) {
    setState((prev) => {
      if (!prev.windows[id]) return prev;
      let changed = false;
      const windows: Record<WindowId, WindowRecord> = {};
      for (const [winId, record] of Object.entries(prev.windows)) {
        if (winId === id) {
          const nextRecord: WindowRecord = record.isFocused && !record.isMinimized
            ? record
            : { ...record, isFocused: true, isMinimized: false };
          if (nextRecord !== record) changed = true;
          windows[winId] = nextRecord;
        } else if (record.isFocused) {
          windows[winId] = { ...record, isFocused: false };
          changed = true;
        } else {
          windows[winId] = record;
        }
      }
      return changed ? { windows } : prev;
    });
  },
  blurWindow(id: WindowId) {
    setState((prev) => {
      const record = prev.windows[id];
      if (!record || !record.isFocused) return prev;
      const windows = { ...prev.windows, [id]: { ...record, isFocused: false } };
      return { windows };
    });
  },
  setMinimized(id: WindowId, minimized: boolean) {
    setState((prev) => {
      const record = prev.windows[id];
      if (!record || record.isMinimized === minimized) return prev;
      const nextRecord: WindowRecord = {
        ...record,
        isMinimized: minimized,
        isFocused: minimized ? false : record.isFocused,
      };
      const windows = { ...prev.windows, [id]: nextRecord };
      return { windows };
    });
  },
  updateTitle(id: WindowId, title: string) {
    setState((prev) => {
      const record = prev.windows[id];
      if (!record || record.title === title) return prev;
      const windows = { ...prev.windows, [id]: { ...record, title } };
      return { windows };
    });
  },
  reset() {
    state = { windows: {} };
    notify();
  },
};

export function useWindowManagerState(): WindowManagerState {
  return useSyncExternalStore(
    windowManagerStore.subscribe,
    windowManagerStore.getState,
    windowManagerStore.getServerSnapshot,
  );
}

export function selectWindowsByApp(state: WindowManagerState): Map<string, WindowRecord[]> {
  const result = new Map<string, WindowRecord[]>();
  for (const record of Object.values(state.windows)) {
    const collection = result.get(record.appId);
    if (collection) {
      collection.push(record);
    } else {
      result.set(record.appId, [record]);
    }
  }
  return result;
}
