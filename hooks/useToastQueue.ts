import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  duration?: number;
  /**
   * Provide to manually group toast entries. Defaults to message + action label.
   */
  groupKey?: string;
}

export interface ToastQueueItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  duration: number;
  count: number;
  actionAvailable: boolean;
  isActionPending: boolean;
  groupKey: string;
}

export interface UseToastQueueConfig {
  maxVisible?: number;
  undoWindow?: number;
}

const DEFAULT_DURATION = 6000;
const DEFAULT_MAX_VISIBLE = 3;
const DEFAULT_UNDO_WINDOW = 5000;

export interface ToastQueueApi {
  toasts: ToastQueueItem[];
  enqueueToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  invokeToastAction: (id: string) => Promise<void>;
  liveAnnouncement: string | null;
}

export const useToastQueue = (
  config: UseToastQueueConfig = {},
): ToastQueueApi => {
  const maxVisible = config.maxVisible ?? DEFAULT_MAX_VISIBLE;
  const undoWindow = config.undoWindow ?? DEFAULT_UNDO_WINDOW;

  const [toasts, setToasts] = useState<ToastQueueItem[]>([]);
  const queueRef = useRef<ToastQueueItem[]>([]);
  const undoTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const groupToIdRef = useRef<Record<string, string>>({});
  const announcementTimer = useRef<NodeJS.Timeout | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    queueRef.current = toasts;
  }, [toasts]);

  const clearUndoTimer = useCallback((id: string) => {
    const timer = undoTimers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete undoTimers.current[id];
    }
  }, []);

  const setAnnouncement = useCallback((message: string | null) => {
    if (announcementTimer.current) {
      clearTimeout(announcementTimer.current);
      announcementTimer.current = null;
    }
    setLiveAnnouncement(message);
    if (message) {
      announcementTimer.current = setTimeout(() => {
        setLiveAnnouncement(null);
        announcementTimer.current = null;
      }, 1200);
    }
  }, []);

  const scheduleUndoTimer = useCallback(
    (id: string, hasUndo: boolean) => {
      clearUndoTimer(id);
      if (!hasUndo) return;
      undoTimers.current[id] = setTimeout(() => {
        setToasts((prev) =>
          prev.map((toast) =>
            toast.id === id
              ? {
                  ...toast,
                  onAction: undefined,
                  actionAvailable: false,
                }
              : toast,
          ),
        );
        clearUndoTimer(id);
      }, undoWindow);
    },
    [clearUndoTimer, undoWindow],
  );

  useEffect(() => () => {
    Object.values(undoTimers.current).forEach((timer) => clearTimeout(timer));
    if (announcementTimer.current) {
      clearTimeout(announcementTimer.current);
    }
  }, []);

  const enqueueToast = useCallback(
    (options: ToastOptions) => {
      const now = Date.now();
      const groupKey = options.groupKey ?? `${options.message}|${options.actionLabel ?? ''}`;
      let scheduled: { id: string; hasUndo: boolean } | null = null;
      let announcementMessage: string | null = null;
      let targetId: string | null = groupToIdRef.current[groupKey] ?? null;

      setToasts((prev) => {
        const existingIndex = prev.findIndex((item) => item.groupKey === groupKey);
        if (existingIndex !== -1) {
          const existing = prev[existingIndex];
          const onAction = options.onAction ?? existing.onAction;
          const updated: ToastQueueItem = {
            ...existing,
            message: options.message ?? existing.message,
            actionLabel: options.actionLabel ?? existing.actionLabel,
            onAction,
            duration: options.duration ?? existing.duration ?? DEFAULT_DURATION,
            count: existing.count + 1,
            actionAvailable: Boolean(onAction),
            isActionPending: false,
          };

          const next = [...prev];
          next[existingIndex] = updated;
          scheduled = { id: existing.id, hasUndo: Boolean(onAction) };
          targetId = existing.id;
          groupToIdRef.current[groupKey] = existing.id;
          if (onAction) {
            announcementMessage = updated.message;
          }
          return next;
        }

        const id = `${now}-${Math.random().toString(16).slice(2)}`;
        const onAction = options.onAction;
        const toast: ToastQueueItem = {
          id,
          groupKey,
          message: options.message,
          actionLabel: options.actionLabel,
          onAction,
          duration: options.duration ?? DEFAULT_DURATION,
          count: 1,
          actionAvailable: Boolean(onAction),
          isActionPending: false,
        };
        scheduled = { id, hasUndo: Boolean(onAction) };
        targetId = id;
        groupToIdRef.current[groupKey] = id;
        if (onAction) {
          announcementMessage = toast.message;
        }
        const next = [...prev, toast];
        if (next.length > maxVisible) {
          const overflow = next.length - maxVisible;
          const trimmed = next.slice(overflow);
          next.slice(0, overflow).forEach((item) => {
            clearUndoTimer(item.id);
            delete groupToIdRef.current[item.groupKey];
          });
          return trimmed;
        }
        return next;
      });

      if (scheduled) {
        scheduleUndoTimer(scheduled.id, scheduled.hasUndo);
      }
      if (announcementMessage) {
        setAnnouncement(`Undo available for ${Math.round(undoWindow / 1000)} seconds for ${announcementMessage}.`);
      }
      return targetId ?? '';
    },
    [clearUndoTimer, maxVisible, scheduleUndoTimer, setAnnouncement, undoWindow],
  );

  const dismissToast = useCallback(
    (id: string) => {
      const toast = queueRef.current.find((item) => item.id === id);
      clearUndoTimer(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      if (toast) {
        delete groupToIdRef.current[toast.groupKey];
      }
    },
    [clearUndoTimer],
  );

  const invokeToastAction = useCallback(
    async (id: string) => {
      const toast = queueRef.current.find((item) => item.id === id);
      if (!toast || !toast.onAction) return;

      setToasts((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                isActionPending: true,
              }
            : item,
        ),
      );

      try {
        await toast.onAction();
      } finally {
        clearUndoTimer(id);
        setToasts((prev) => prev.filter((item) => item.id !== id));
        delete groupToIdRef.current[toast.groupKey];
      }
    },
    [clearUndoTimer],
  );

  return {
    toasts,
    enqueueToast,
    dismissToast,
    invokeToastAction,
    liveAnnouncement,
  };
};

export default useToastQueue;
