import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface DraftPayload<T> {
  data: T;
  savedAt: number;
}

type IsEmpty<T> = (snapshot: T) => boolean;

const defaultIsEmpty = <T,>(snapshot: T) => {
  if (snapshot == null) return true;
  if (typeof snapshot !== 'object') {
    return snapshot === '' || snapshot === null;
  }
  return !Object.values(snapshot as Record<string, unknown>).some((value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return Boolean(value);
  });
};

const formatSavedMessage = (timestamp: number) => {
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
    return `Saved ${formatter.format(new Date(timestamp))}`;
  } catch {
    return 'Saved';
  }
};

export interface UseDraftAutosaveOptions<T> {
  storageKey: string;
  snapshot: T;
  debounceMs?: number;
  isEmpty?: IsEmpty<T>;
}

export interface UseDraftAutosaveResult<T> {
  draft: T | null;
  lastSavedAt: number | null;
  statusMessage: string;
  recovered: boolean;
  isHydrated: boolean;
  clearDraft: () => void;
}

const useDraftAutosave = <T,>(
  options: UseDraftAutosaveOptions<T>
): UseDraftAutosaveResult<T> => {
  const { storageKey, snapshot, debounceMs = 2000, isEmpty } = options;

  const isEmptyRef = useRef<IsEmpty<T>>(isEmpty ?? defaultIsEmpty);
  isEmptyRef.current = isEmpty ?? defaultIsEmpty;

  const [draft, setDraft] = useState<T | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [recovered, setRecovered] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const previousSnapshotRef = useRef<string | null>(null);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setDraft(null);
    setLastSavedAt(null);
    setStatusMessage('');
    setRecovered(false);
    previousSnapshotRef.current = JSON.stringify(snapshot);
  }, [storageKey, snapshot]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftPayload<T> | (T & {
          savedAt?: number;
        });
        const payload = (parsed as DraftPayload<T>).data
          ? (parsed as DraftPayload<T>)
          : { data: parsed as T, savedAt: (parsed as any).savedAt };
        setDraft(payload.data);
        const hasContent = !isEmptyRef.current(payload.data);
        setRecovered(hasContent);
        if (payload.savedAt) {
          setLastSavedAt(payload.savedAt);
          setStatusMessage(formatSavedMessage(payload.savedAt));
        } else if (hasContent) {
          setStatusMessage('Saved earlier');
        }
        previousSnapshotRef.current = JSON.stringify(payload.data);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hydrated) return;
    const serialized = JSON.stringify(snapshot);
    if (previousSnapshotRef.current === serialized) {
      return;
    }
    const shouldStore = !isEmptyRef.current(snapshot);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = window.setTimeout(() => {
      try {
        if (shouldStore) {
          const payload: DraftPayload<T> = {
            data: snapshot,
            savedAt: Date.now(),
          };
          window.localStorage.setItem(storageKey, JSON.stringify(payload));
          setLastSavedAt(payload.savedAt);
          setStatusMessage(formatSavedMessage(payload.savedAt));
          setRecovered((prev) => prev || !isEmptyRef.current(snapshot));
        } else {
          window.localStorage.removeItem(storageKey);
          setLastSavedAt(null);
          setStatusMessage('');
          setRecovered(false);
        }
        previousSnapshotRef.current = serialized;
      } catch {
        /* ignore */
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [snapshot, debounceMs, hydrated, storageKey]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const result = useMemo(
    () => ({
      draft,
      lastSavedAt,
      statusMessage,
      recovered,
      isHydrated: hydrated,
      clearDraft,
    }),
    [draft, lastSavedAt, statusMessage, recovered, hydrated, clearDraft]
  );

  return result;
};

export default useDraftAutosave;

