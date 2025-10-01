"use client";

import { useCallback } from 'react';
import usePersistentState from './usePersistentState';

type Orientation = 'horizontal' | 'vertical';

export interface TabLayoutState {
  split: boolean;
  orientation: Orientation;
  size: number;
  linkScroll: boolean;
}

const DEFAULT_LAYOUT_STATE: TabLayoutState = {
  split: false,
  orientation: 'horizontal',
  size: 0.5,
  linkScroll: false,
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isOrientation = (value: unknown): value is Orientation =>
  value === 'horizontal' || value === 'vertical';

const isTabLayoutState = (value: unknown): value is TabLayoutState =>
  !!value &&
  typeof value === 'object' &&
  'split' in value &&
  'orientation' in value &&
  'size' in value &&
  'linkScroll' in value &&
  typeof (value as TabLayoutState).split === 'boolean' &&
  isOrientation((value as TabLayoutState).orientation) &&
  isFiniteNumber((value as TabLayoutState).size) &&
  typeof (value as TabLayoutState).linkScroll === 'boolean';

const isLayoutRecord = (
  value: unknown,
): value is Record<string, TabLayoutState> => {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).every((entry) =>
    isTabLayoutState(entry),
  );
};

export interface TabLayoutStore {
  layouts: Record<string, TabLayoutState>;
  getLayout: (tabId: string) => TabLayoutState;
  updateLayout: (
    tabId: string,
    updater:
      | Partial<TabLayoutState>
      | ((current: TabLayoutState) => TabLayoutState | Partial<TabLayoutState>),
  ) => void;
  removeLayout: (tabId: string) => void;
  clearAll: () => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const mergeLayout = (
  current: TabLayoutState,
  next: Partial<TabLayoutState> | TabLayoutState,
): TabLayoutState => {
  const merged: TabLayoutState = {
    ...current,
    ...next,
  };
  merged.size = clamp(merged.size, 0.1, 0.9);
  return merged;
};

export default function useTabLayoutStore(): TabLayoutStore {
  const [layouts, setLayouts, , clearAll] = usePersistentState<Record<string, TabLayoutState>>(
    'tab-layout-store',
    {},
    isLayoutRecord,
  );

  const getLayout = useCallback(
    (tabId: string) => ({
      ...DEFAULT_LAYOUT_STATE,
      ...(tabId && layouts[tabId] ? layouts[tabId] : {}),
    }),
    [layouts],
  );

  const updateLayout = useCallback<TabLayoutStore['updateLayout']>(
    (tabId, updater) => {
      if (!tabId) return;
      setLayouts((prev) => {
        const current = { ...DEFAULT_LAYOUT_STATE, ...(prev[tabId] ?? {}) };
        const result =
          typeof updater === 'function' ? updater(current) : updater;
        const nextState = mergeLayout(current, result);
        return { ...prev, [tabId]: nextState };
      });
    },
    [setLayouts],
  );

  const removeLayout = useCallback(
    (tabId: string) => {
      if (!tabId) return;
      setLayouts((prev) => {
        if (!(tabId in prev)) return prev;
        const next = { ...prev };
        delete next[tabId];
        return next;
      });
    },
    [setLayouts],
  );

  const clearStore = useCallback(() => clearAll(), [clearAll]);

  return {
    layouts,
    getLayout,
    updateLayout,
    removeLayout,
    clearAll: clearStore,
  };
}

export { DEFAULT_LAYOUT_STATE };
