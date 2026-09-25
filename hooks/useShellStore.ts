"use client";

import { useSyncExternalStore } from "react";

const WINDOW_STACK_BASE_Z_INDEX = 200;

export type ShellStackState = {
  activeWindowId: string | null;
  stack: string[];
};

export type RegisterWindowOptions = {
  /**
   * When true the window becomes the active window once registered.
   */
  activate?: boolean;
  /**
   * Insert the window at a specific stack index. The value is clamped between
   * 0 and the current stack length. When omitted, the window is appended to the
   * top of the stack.
   */
  index?: number;
  /**
   * Convenience flag to send the window to the bottom of the stack when no
   * explicit index is provided.
   */
  position?: "top" | "bottom";
};

export type ShellStoreSnapshot = ShellStackState & {
  registerWindow: (id: string, options?: RegisterWindowOptions) => void;
  unregisterWindow: (id: string) => void;
  focusWindow: (id: string | null) => void;
  setActiveWindowId: (id: string | null) => void;
  sendToBack: (id: string) => void;
  getZIndex: (id: string) => number;
};

type Listener = () => void;

const stacksEqual = (a: readonly string[], b: readonly string[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const clampIndex = (value: number, length: number) => {
  if (!Number.isFinite(value)) return length;
  if (value < 0) return 0;
  if (value > length) return length;
  return Math.floor(value);
};

class ShellStoreImpl {
  private state: ShellStackState = {
    activeWindowId: null,
    stack: [],
  };

  private listeners: Set<Listener> = new Set();

  private snapshot: ShellStoreSnapshot = this.createSnapshot();

  private createSnapshot(): ShellStoreSnapshot {
    return {
      activeWindowId: this.state.activeWindowId,
      stack: [...this.state.stack],
      registerWindow: this.registerWindow,
      unregisterWindow: this.unregisterWindow,
      focusWindow: this.focusWindow,
      setActiveWindowId: this.setActiveWindowId,
      sendToBack: this.sendToBack,
      getZIndex: this.getZIndex,
    };
  }

  private emit() {
    this.snapshot = this.createSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  private ensureActiveId(stack: string[], desired: string | null): string | null {
    if (!desired) {
      return stack.length ? stack[stack.length - 1] ?? null : null;
    }
    return stack.includes(desired) ? desired : stack.length ? stack[stack.length - 1] ?? null : null;
  }

  private setState(updater: (prev: ShellStackState) => ShellStackState): ShellStackState {
    const next = updater(this.state);
    if (
      next.activeWindowId === this.state.activeWindowId &&
      stacksEqual(next.stack, this.state.stack)
    ) {
      return this.state;
    }
    this.state = {
      activeWindowId: next.activeWindowId,
      stack: [...next.stack],
    };
    this.emit();
    return this.state;
  }

  getSnapshot = () => this.snapshot;

  getState = () => this.state;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  registerWindow = (id: string, options?: RegisterWindowOptions) => {
    if (!id) return;
    this.setState((prev) => {
      const existing = prev.stack.filter((entry) => entry !== id);
      const position = options?.position ?? "top";
      let nextStack: string[];

      if (typeof options?.index === "number") {
        const index = clampIndex(options.index, existing.length);
        nextStack = [...existing.slice(0, index), id, ...existing.slice(index)];
      } else if (position === "bottom") {
        nextStack = [id, ...existing];
      } else {
        nextStack = [...existing, id];
      }

      let activeWindowId = prev.activeWindowId;
      if (options?.activate || !activeWindowId) {
        activeWindowId = id;
      }
      activeWindowId = this.ensureActiveId(nextStack, activeWindowId);

      return {
        activeWindowId,
        stack: nextStack,
      };
    });
  };

  unregisterWindow = (id: string) => {
    if (!id) return;
    this.setState((prev) => {
      if (!prev.stack.includes(id)) {
        return prev;
      }
      const nextStack = prev.stack.filter((entry) => entry !== id);
      const activeWindowId = prev.activeWindowId === id
        ? this.ensureActiveId(nextStack, null)
        : this.ensureActiveId(nextStack, prev.activeWindowId);
      return {
        activeWindowId,
        stack: nextStack,
      };
    });
  };

  focusWindow = (id: string | null) => {
    if (!id) {
      this.setState((prev) => ({
        activeWindowId: null,
        stack: [...prev.stack],
      }));
      return;
    }

    this.setState((prev) => {
      const filtered = prev.stack.filter((entry) => entry !== id);
      const nextStack = [...filtered, id];
      return {
        activeWindowId: id,
        stack: nextStack,
      };
    });
  };

  setActiveWindowId = (id: string | null) => {
    if (id === null) {
      this.focusWindow(null);
    } else {
      this.focusWindow(id);
    }
  };

  sendToBack = (id: string) => {
    if (!id) return;
    this.setState((prev) => {
      if (!prev.stack.includes(id)) {
        return prev;
      }
      const filtered = prev.stack.filter((entry) => entry !== id);
      const nextStack = [id, ...filtered];
      const activeWindowId = prev.activeWindowId === id
        ? this.ensureActiveId(nextStack, null)
        : this.ensureActiveId(nextStack, prev.activeWindowId);
      return {
        activeWindowId,
        stack: nextStack,
      };
    });
  };

  getZIndex = (id: string) => {
    const index = this.state.stack.indexOf(id);
    if (index === -1) {
      return WINDOW_STACK_BASE_Z_INDEX;
    }
    return WINDOW_STACK_BASE_Z_INDEX + index;
  };
}

export const shellStore = new ShellStoreImpl();

export function useShellStore(): ShellStoreSnapshot;
export function useShellStore<T>(selector: (snapshot: ShellStoreSnapshot) => T): T;
export function useShellStore<T>(selector?: (snapshot: ShellStoreSnapshot) => T) {
  const snapshot = useSyncExternalStore(shellStore.subscribe, shellStore.getSnapshot, shellStore.getSnapshot);
  return selector ? selector(snapshot) : snapshot;
}

export { WINDOW_STACK_BASE_Z_INDEX };
