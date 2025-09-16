'use client';

export type WorkspaceId = string;
export type WindowId = string;

export interface DesktopWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopWindow {
  id: WindowId;
  title: string;
  workspaceId: WorkspaceId;
  minimized: boolean;
  bounds?: DesktopWindowBounds;
  zIndex?: number;
}

export interface WindowManagerSnapshot {
  activeWorkspaceId: WorkspaceId | null;
  windows: Record<WindowId, DesktopWindow>;
}

type Listener = () => void;

let snapshot: WindowManagerSnapshot = {
  activeWorkspaceId: null,
  windows: {},
};

const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): WindowManagerSnapshot {
  return snapshot;
}

export function getServerSnapshot(): WindowManagerSnapshot {
  return snapshot;
}

export function setSnapshot(nextSnapshot: WindowManagerSnapshot): void {
  snapshot = nextSnapshot;
  emit();
}

export const wm = {
  focus(windowId: WindowId): void {
    const win = snapshot.windows[windowId];
    if (!win) return;

    const shouldRestore = win.minimized;
    const workspaceChanged = snapshot.activeWorkspaceId !== win.workspaceId;

    if (!shouldRestore && !workspaceChanged) {
      return;
    }

    const nextWin = shouldRestore ? { ...win, minimized: false } : win;
    const windows = shouldRestore
      ? { ...snapshot.windows, [windowId]: nextWin }
      : snapshot.windows;

    snapshot = {
      ...snapshot,
      activeWorkspaceId: win.workspaceId,
      windows,
    };
    emit();
  },

  minimize(windowId: WindowId): void {
    const win = snapshot.windows[windowId];
    if (!win || win.minimized) return;

    snapshot = {
      ...snapshot,
      windows: {
        ...snapshot.windows,
        [windowId]: { ...win, minimized: true },
      },
    };
    emit();
  },

  close(windowId: WindowId): void {
    if (!snapshot.windows[windowId]) return;

    const { [windowId]: _removed, ...rest } = snapshot.windows;
    snapshot = {
      ...snapshot,
      windows: rest,
    };
    emit();
  },
};

export default wm;
