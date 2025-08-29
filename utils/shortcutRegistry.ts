export interface Shortcut {
  keys: string;
  description: string;
}

export type ShortcutListener = (shortcuts: Shortcut[]) => void;

const shortcuts: Shortcut[] = [];
const listeners = new Set<ShortcutListener>();

export function registerShortcut(shortcut: Shortcut) {
  shortcuts.push(shortcut);
  listeners.forEach((l) => l([...shortcuts]));
}

export function getShortcuts(): Shortcut[] {
  return [...shortcuts];
}

export function subscribe(listener: ShortcutListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearShortcuts() {
  shortcuts.length = 0;
  listeners.forEach((l) => l([]));
}

export function updateShortcut(description: string, keys: string) {
  const shortcut = shortcuts.find((s) => s.description === description);
  if (shortcut) {
    shortcut.keys = keys;
    listeners.forEach((l) => l([...shortcuts]));
  }
}
