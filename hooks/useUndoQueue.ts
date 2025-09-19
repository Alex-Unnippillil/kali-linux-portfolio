import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_TIMEOUT = 8000;

export type UndoActionType = 'file-delete';

export interface UndoMetadata {
  fileName: string;
  path: string;
  size?: number;
  mimeType?: string;
  [key: string]: unknown;
}

export interface UndoEntry {
  id: string;
  type: UndoActionType;
  metadata: UndoMetadata;
  undo: () => Promise<void> | void;
  expiresAt: number;
}

interface EnqueueParams {
  type: UndoActionType;
  metadata: UndoMetadata;
  undo: () => Promise<void> | void;
  timeoutMs?: number;
}

export interface UseUndoQueueOptions {
  defaultTimeout?: number;
}

export interface UseUndoQueueResult {
  entries: UndoEntry[];
  enqueue: (params: EnqueueParams) => string;
  undo: (id: string) => Promise<boolean>;
  remove: (id: string) => void;
  getEntry: (id: string) => UndoEntry | undefined;
  clear: () => void;
}

export default function useUndoQueue(
  options: UseUndoQueueOptions = {},
): UseUndoQueueResult {
  const defaultTimeout = options.defaultTimeout ?? DEFAULT_TIMEOUT;
  const [entries, setEntries] = useState<UndoEntry[]>([]);
  const entriesRef = useRef<UndoEntry[]>(entries);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => () => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const remove = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const clear = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
    setEntries([]);
  }, []);

  const enqueue = useCallback(
    ({ type, metadata, undo, timeoutMs }: EnqueueParams) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const timeout = timeoutMs ?? defaultTimeout;
      const expiresAt = Date.now() + timeout;
      const entry: UndoEntry = {
        id,
        type,
        metadata,
        undo,
        expiresAt,
      };
      setEntries(prev => [...prev, entry]);
      const timer = setTimeout(() => {
        remove(id);
      }, timeout);
      timersRef.current.set(id, timer);
      return id;
    },
    [defaultTimeout, remove],
  );

  const undoAction = useCallback(
    async (id: string) => {
      const entry = entriesRef.current.find(item => item.id === id);
      if (!entry) return false;
      remove(id);
      try {
        await entry.undo();
        return true;
      } catch (error) {
        const retryEntry: UndoEntry = {
          ...entry,
          expiresAt: Date.now() + defaultTimeout,
        };
        setEntries(prev => [...prev, retryEntry]);
        const timer = setTimeout(() => {
          remove(retryEntry.id);
        }, defaultTimeout);
        timersRef.current.set(retryEntry.id, timer);
        return false;
      }
    },
    [defaultTimeout, remove],
  );

  const getEntry = useCallback(
    (id: string) => entriesRef.current.find(item => item.id === id),
    [],
  );

  return { entries, enqueue, undo: undoAction, remove, getEntry, clear };
}
