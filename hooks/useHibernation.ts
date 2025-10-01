import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SnapshotValue = unknown;

interface HibernationPane<TSnapshot = SnapshotValue> {
  id: string;
  disabled?: boolean;
  snapshot?: () => TSnapshot;
  restore?: (snapshot: TSnapshot | null) => void;
}

interface UseHibernationOptions<TSnapshot = SnapshotValue> {
  idleMs: number;
  panes: HibernationPane<TSnapshot>[];
  onHibernate?: (id: string, snapshot: TSnapshot | null) => void;
  onResume?: (id: string, snapshot: TSnapshot | null) => void;
}

interface UseHibernationReturn<TSnapshot = SnapshotValue> {
  hibernating: Record<string, boolean>;
  lastInteraction: Record<string, number>;
  markInteraction: (id: string) => void;
  wake: (id: string) => void;
  getSnapshot: (id: string) => TSnapshot | null;
}

function useHibernation<TSnapshot = SnapshotValue>({
  idleMs,
  panes,
  onHibernate,
  onResume,
}: UseHibernationOptions<TSnapshot>): UseHibernationReturn<TSnapshot> {
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const snapshotsRef = useRef<Record<string, TSnapshot | null>>({});
  const panesRef = useRef<Record<string, HibernationPane<TSnapshot>>>({});
  const lastInteractionRef = useRef<Record<string, number>>({});
  const hibernatingRef = useRef<Record<string, boolean>>({});

  const [hibernatingState, setHibernatingState] = useState<Record<string, boolean>>({});
  const [lastInteractionState, setLastInteractionState] = useState<Record<string, number>>({});

  const setHibernating = useCallback(
    (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      setHibernatingState((prev) => {
        const next = updater(prev);
        if (next === prev) {
          return prev;
        }
        hibernatingRef.current = next;
        return next;
      });
    },
    [],
  );

  const updateLastInteraction = useCallback((id: string, timestamp: number) => {
    lastInteractionRef.current[id] = timestamp;
    setLastInteractionState((prev) => {
      if (prev[id] === timestamp) return prev;
      return { ...prev, [id]: timestamp };
    });
  }, []);

  const hibernatePane = useCallback(
    (id: string) => {
      const pane = panesRef.current[id];
      if (!pane || pane.disabled) return;
      const snapshot = pane.snapshot ? pane.snapshot() : null;
      snapshotsRef.current[id] = snapshot;
      setHibernating((prev) => {
        if (prev[id]) return prev;
        return { ...prev, [id]: true };
      });
      onHibernate?.(id, snapshot);
    },
    [onHibernate, setHibernating],
  );

  const schedule = useCallback(
    (id: string) => {
      const pane = panesRef.current[id];
      if (!pane || pane.disabled || idleMs <= 0) {
        if (timersRef.current[id]) {
          clearTimeout(timersRef.current[id]);
          delete timersRef.current[id];
        }
        return;
      }
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
      }
      timersRef.current[id] = setTimeout(() => {
        hibernatePane(id);
      }, idleMs);
    },
    [hibernatePane, idleMs],
  );

  const wake = useCallback(
    (id: string) => {
      if (!hibernatingRef.current[id]) {
        schedule(id);
        return;
      }
      const pane = panesRef.current[id];
      if (!pane) return;
      const snapshot = snapshotsRef.current[id] ?? null;
      delete snapshotsRef.current[id];
      pane.restore?.(snapshot);
      setHibernating((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      const now = Date.now();
      updateLastInteraction(id, now);
      onResume?.(id, snapshot);
      schedule(id);
    },
    [onResume, schedule, setHibernating, updateLastInteraction],
  );

  const markInteraction = useCallback(
    (id: string) => {
      const pane = panesRef.current[id];
      if (!pane) return;
      const now = Date.now();
      updateLastInteraction(id, now);
      if (hibernatingRef.current[id]) {
        wake(id);
        return;
      }
      schedule(id);
    },
    [schedule, updateLastInteraction, wake],
  );

  useEffect(() => {
    const paneMap: Record<string, HibernationPane<TSnapshot>> = {};
    panes.forEach((pane) => {
      paneMap[pane.id] = pane;
    });
    panesRef.current = paneMap;

    setLastInteractionState((prev) => {
      const next = { ...prev };
      let changed = false;
      const now = Date.now();
      panes.forEach(({ id }) => {
        if (!next[id]) {
          next[id] = now;
          lastInteractionRef.current[id] = now;
          changed = true;
        }
      });
      Object.keys(next).forEach((id) => {
        if (!paneMap[id]) {
          delete next[id];
          delete lastInteractionRef.current[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    Object.keys(timersRef.current).forEach((id) => {
      if (!paneMap[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    });

    setHibernating((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(prev).forEach((id) => {
        if (!paneMap[id]) {
          delete next[id];
          delete snapshotsRef.current[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    panes.forEach(({ id, disabled }) => {
      if (disabled) {
        if (hibernatingRef.current[id]) {
          wake(id);
        }
        if (timersRef.current[id]) {
          clearTimeout(timersRef.current[id]);
          delete timersRef.current[id];
        }
        return;
      }
      schedule(id);
    });
  }, [panes, schedule, setHibernating, wake]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
      timersRef.current = {};
    };
  }, []);

  const hibernating = useMemo(() => hibernatingState, [hibernatingState]);
  const lastInteraction = useMemo(() => lastInteractionState, [lastInteractionState]);

  const getSnapshot = useCallback((id: string) => snapshotsRef.current[id] ?? null, []);

  return {
    hibernating,
    lastInteraction,
    markInteraction,
    wake,
    getSnapshot,
  };
}

export type { HibernationPane, UseHibernationOptions, UseHibernationReturn };
export default useHibernation;
