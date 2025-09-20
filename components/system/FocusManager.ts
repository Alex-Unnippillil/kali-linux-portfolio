import { useSyncExternalStore } from 'react';

export interface SkipTargetConfig {
  id: string;
  label: string;
  shortcut?: string;
  priority?: number;
  getNode: () => HTMLElement | null;
  isAvailable?: () => boolean;
  getAnnouncement?: (element: HTMLElement | null) => string | null | undefined;
}

export interface FocusAnnouncement {
  message: string;
  timestamp: number;
}

type SkipTargetInternal = SkipTargetConfig;

const skipTargets = new Map<string, SkipTargetInternal>();
const targetListeners = new Set<() => void>();

let announcementState: FocusAnnouncement = { message: '', timestamp: 0 };
const announcementListeners = new Set<() => void>();

const getTargetsSnapshot = () =>
  Array.from(skipTargets.values()).sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  );

const subscribeTargets = (listener: () => void) => {
  targetListeners.add(listener);
  return () => {
    targetListeners.delete(listener);
  };
};

const getAnnouncementSnapshot = () => announcementState;

const subscribeAnnouncements = (listener: () => void) => {
  announcementListeners.add(listener);
  return () => {
    announcementListeners.delete(listener);
  };
};

const emitTargets = () => {
  targetListeners.forEach((listener) => listener());
};

const emitAnnouncement = () => {
  announcementListeners.forEach((listener) => listener());
};

const schedule = (callback: () => void) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
};

const setAnnouncement = (message: string) => {
  announcementState = { message, timestamp: Date.now() };
  emitAnnouncement();
};

export function announceFocus(message: string) {
  if (!message) return;
  if (typeof window === 'undefined') {
    setAnnouncement(message);
    return;
  }

  setAnnouncement('');
  schedule(() => setAnnouncement(message));
}

export interface FocusSkipOptions {
  silent?: boolean;
  announcement?: string | null;
  fallbackAnnouncement?: string;
  preventScroll?: boolean;
}

export function focusSkipTarget(id: string, options: FocusSkipOptions = {}) {
  const target = skipTargets.get(id);
  if (!target) {
    if (!options.silent && options.fallbackAnnouncement) {
      announceFocus(options.fallbackAnnouncement);
    }
    return false;
  }

  if (target.isAvailable && !target.isAvailable()) {
    if (!options.silent) {
      const message =
        options.fallbackAnnouncement ?? `The ${target.label.toLowerCase()} is not available right now.`;
      announceFocus(message);
    }
    return false;
  }

  const node = target.getNode();
  if (!node) {
    if (!options.silent) {
      const message =
        options.fallbackAnnouncement ?? `The ${target.label.toLowerCase()} is not currently available.`;
      announceFocus(message);
    }
    return false;
  }

  try {
    node.focus({ preventScroll: options.preventScroll ?? true });
  } catch (error) {
    node.focus();
  }

  if (!options.silent) {
    const message =
      options.announcement ?? target.getAnnouncement?.(node) ?? `Focused on the ${target.label}.`;
    if (message) {
      announceFocus(message);
    }
  }

  return true;
}

export function registerSkipTarget(target: SkipTargetConfig) {
  skipTargets.set(target.id, target);
  emitTargets();
  return () => {
    const current = skipTargets.get(target.id);
    if (current === target) {
      skipTargets.delete(target.id);
      emitTargets();
    }
  };
}

export function notifySkipTargetsChanged() {
  emitTargets();
}

export function useSkipTargets() {
  return useSyncExternalStore(subscribeTargets, getTargetsSnapshot, getTargetsSnapshot);
}

export function useFocusAnnouncement() {
  return useSyncExternalStore(
    subscribeAnnouncements,
    getAnnouncementSnapshot,
    getAnnouncementSnapshot,
  );
}

