'use client';

import { useSyncExternalStore } from 'react';

export type QueueStatus = 'queued' | 'running' | 'success' | 'failed';

export interface FailureLogEntry {
  id: string;
  message: string;
  timestamp: number;
  attempt: number;
}

export interface QueueItem {
  id: string;
  command: string;
  status: QueueStatus;
  retries: number;
  maxRetries: number;
  failures: FailureLogEntry[];
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

interface QueueState {
  items: QueueItem[];
}

const DEFAULT_MAX_RETRIES = 3;

const listeners = new Set<() => void>();
let state: QueueState = { items: [] };

const getSnapshot = () => state;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setState = (updater: (state: QueueState) => QueueState) => {
  state = updater(state);
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createQueueItem = (
  command: string,
  maxRetries: number,
  id?: string,
): QueueItem => {
  const now = Date.now();
  return {
    id: id ?? createId(),
    command,
    status: 'queued',
    retries: 0,
    maxRetries,
    failures: [],
    createdAt: now,
    updatedAt: now,
  };
};

const updateQueueItem = (
  id: string,
  updater: (item: QueueItem) => QueueItem,
): QueueItem | undefined => {
  let updated: QueueItem | undefined;
  setState((prev) => {
    const index = prev.items.findIndex((item) => item.id === id);
    if (index === -1) {
      return prev;
    }
    const nextItem = updater(prev.items[index]);
    const items = [...prev.items];
    items[index] = nextItem;
    updated = nextItem;
    return { ...prev, items };
  });
  return updated;
};

const enqueueCommand = (
  command: string,
  options?: { id?: string; maxRetries?: number },
): QueueItem => {
  const item = createQueueItem(command, options?.maxRetries ?? DEFAULT_MAX_RETRIES, options?.id);
  setState((prev) => ({ ...prev, items: [...prev.items, item] }));
  return item;
};

const markCommandRunning = (id: string) =>
  updateQueueItem(id, (item) => ({ ...item, status: 'running', updatedAt: Date.now() }));

const markCommandSuccess = (id: string) =>
  updateQueueItem(id, (item) => ({
    ...item,
    status: 'success',
    lastError: undefined,
    updatedAt: Date.now(),
  }));

const markCommandFailure = (id: string, message: string) =>
  updateQueueItem(id, (item) => {
    const attempt = item.retries + 1;
    const timestamp = Date.now();
    const failure: FailureLogEntry = {
      id: `${id}-failure-${attempt}-${timestamp}`,
      attempt,
      message,
      timestamp,
    };
    return {
      ...item,
      status: 'failed',
      retries: attempt,
      lastError: message,
      failures: [...item.failures, failure],
      updatedAt: timestamp,
    };
  });

const retryCommand = (id: string) => {
  let retried: QueueItem | undefined;
  setState((prev) => {
    const index = prev.items.findIndex((item) => item.id === id);
    if (index === -1) {
      return prev;
    }
    const current = prev.items[index];
    if (current.retries >= current.maxRetries) {
      retried = undefined;
      return prev;
    }
    const next: QueueItem = {
      ...current,
      status: 'queued',
      updatedAt: Date.now(),
    };
    const items = [...prev.items];
    items[index] = next;
    retried = next;
    return { ...prev, items };
  });
  return retried;
};

const removeCommand = (id: string) => {
  setState((prev) => ({
    ...prev,
    items: prev.items.filter((item) => item.id !== id),
  }));
};

const resetQueue = () => {
  state = { items: [] };
  notify();
};

export function useQueueStore<T>(selector: (state: QueueState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));
}

export const queueStore = {
  subscribe,
  getState: getSnapshot,
};

export const queueActions = {
  enqueueCommand,
  markCommandRunning,
  markCommandSuccess,
  markCommandFailure,
  retryCommand,
  removeCommand,
  resetQueue,
};

export type { QueueState };
