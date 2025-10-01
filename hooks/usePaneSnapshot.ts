import { useEffect, useRef } from 'react';
import {
  capturePaneSnapshot,
  clearPaneSnapshot,
  consumePendingPaneRestore,
  markPaneActive,
} from '../utils/windowLayout';

export interface PaneSnapshotOptions<TSnapshot> {
  paneId: string;
  getSnapshot: () => TSnapshot;
  applySnapshot?: (snapshot: TSnapshot) => void;
  enabled?: boolean;
  clearOnUnmount?: boolean;
}

export function usePaneSnapshot<TSnapshot>({
  paneId,
  getSnapshot,
  applySnapshot,
  enabled = true,
  clearOnUnmount = false,
}: PaneSnapshotOptions<TSnapshot>) {
  const idRef = useRef(paneId);

  useEffect(() => {
    idRef.current = paneId;
  }, [paneId]);

  useEffect(() => {
    if (!enabled) return;
    const restored = consumePendingPaneRestore(idRef.current);
    if (restored && applySnapshot) {
      applySnapshot(restored as TSnapshot);
    }
  }, [applySnapshot, enabled]);

  useEffect(() => {
    if (!enabled) return;
    markPaneActive(idRef.current);
  }, [enabled, paneId]);

  useEffect(() => {
    if (!enabled) return;
    try {
      const snapshot = getSnapshot();
      capturePaneSnapshot(idRef.current, snapshot);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[usePaneSnapshot] Failed to record snapshot', error);
      }
    }
  }, [enabled, getSnapshot]);

  useEffect(() => {
    if (!enabled || !clearOnUnmount) return;
    return () => {
      clearPaneSnapshot(idRef.current);
    };
  }, [enabled, clearOnUnmount]);
}

export default usePaneSnapshot;
