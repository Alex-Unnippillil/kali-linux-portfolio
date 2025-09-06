import { useSyncExternalStore } from 'react';

const store = {
  shares: new Set<string>(),
  listeners: new Set<() => void>(),
};

function emit() {
  store.listeners.forEach((l) => l());
}

export function toggleShare(path: string) {
  const next = new Set(store.shares);
  if (next.has(path)) {
    next.delete(path);
  } else {
    next.add(path);
  }
  store.shares = next;
  emit();
}

export function useShares() {
  const set = useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    () => store.shares,
    () => store.shares
  );
  return Array.from(set);
}

export function isShared(path: string) {
  return store.shares.has(path);
}
