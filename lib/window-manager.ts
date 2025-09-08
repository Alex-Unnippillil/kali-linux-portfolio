export interface AppWindow {
  id: string;
  title: string;
}

let windows: AppWindow[] = [];
let activeId: string | null = null;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getWindows() {
  return windows;
}

export function registerWindow(win: AppWindow) {
  windows.push(win);
  emit();
}

export function unregisterWindow(id: string) {
  windows = windows.filter((w) => w.id !== id);
  emit();
}

export function activateWindow(id: string) {
  activeId = id;
  emit();
}

export function getActiveWindow() {
  return activeId;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reset() {
  windows = [];
  activeId = null;
  emit();
}
