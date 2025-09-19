import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Toast from './Toast';

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 6000;

interface NotificationWorkerResponse {
  id: string;
  message?: string;
  preview?: string;
  averageColor?: string;
}

interface NotificationWorkerRequest {
  id: string;
  message: string;
  analyzeText: boolean;
  imageData?: {
    buffer: ArrayBuffer;
    width: number;
    height: number;
  };
}

const normalizeMessage = (value: string) => value.replace(/\s+/g, ' ').trim();
const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

export interface ToastMetaInput {
  analyzeText?: boolean;
  imageData?: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
}

export interface ToastMeta {
  preview?: string;
  averageColor?: string;
}

export interface ToastOptions {
  id?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  meta?: ToastMetaInput;
}

export interface ToastRecord {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
  count: number;
  status: 'visible' | 'queued';
  visibleSince: number;
  version: number;
  meta?: ToastMeta;
}

interface ToastContextValue {
  notify: (options: ToastOptions) => Promise<string>;
  dismiss: (id: string) => void;
  clear: () => void;
  toasts: ToastRecord[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const promoteToVisible = (items: ToastRecord[]) => {
  let visibleCount = 0;
  items.forEach((item) => {
    if (item.status === 'visible') {
      visibleCount += 1;
    }
  });

  if (visibleCount >= MAX_VISIBLE) return items;

  let changed = false;
  const promoted = items.map((item) => {
    if (item.status === 'queued' && visibleCount < MAX_VISIBLE) {
      visibleCount += 1;
      changed = true;
      return {
        ...item,
        status: 'visible' as const,
        visibleSince: Date.now(),
        version: item.version + 1,
      };
    }
    return item;
  });

  return changed ? promoted : items;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, (payload?: NotificationWorkerResponse | null) => void>());

  const ensureWorker = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.Worker === 'undefined') {
      return null;
    }
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../workers/notificationFormatter.worker.ts', import.meta.url),
      );
      workerRef.current.onmessage = (event: MessageEvent<NotificationWorkerResponse>) => {
        const resolver = pendingRef.current.get(event.data.id);
        if (resolver) {
          resolver(event.data);
          pendingRef.current.delete(event.data.id);
        }
      };
      workerRef.current.onerror = () => {
        pendingRef.current.forEach((resolver) => resolver(null));
        pendingRef.current.clear();
      };
    }
    return workerRef.current;
  }, []);

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  const formatNotification = useCallback(
    async (options: ToastOptions): Promise<ToastOptions & { meta?: ToastMeta }> => {
      const analyzeText =
        options.meta?.analyzeText ??
        (options.message.length > 120 || /\n/.test(options.message));
      const hasImageData = Boolean(options.meta?.imageData);

      if (!analyzeText && !hasImageData) {
        return options;
      }

      const worker = ensureWorker();
      if (!worker) {
        const nextMessage = analyzeText ? normalizeMessage(options.message) : options.message;
        const nextMeta: ToastMeta | undefined = analyzeText
          ? { preview: nextMessage }
          : undefined;
        return {
          ...options,
          message: nextMessage,
          meta: nextMeta,
        };
      }

      const requestId = createId('toast-worker');
      const payload: NotificationWorkerRequest = {
        id: requestId,
        message: options.message,
        analyzeText,
      };

      const transfers: Transferable[] = [];
      if (options.meta?.imageData) {
        const cloned = options.meta.imageData.data.slice();
        payload.imageData = {
          buffer: cloned.buffer,
          width: options.meta.imageData.width,
          height: options.meta.imageData.height,
        };
        transfers.push(cloned.buffer);
      }

      return new Promise((resolve) => {
        pendingRef.current.set(requestId, (response) => {
          pendingRef.current.delete(requestId);
          if (!response) {
            resolve(options);
            return;
          }
          resolve({
            ...options,
            message: response.message ?? options.message,
            meta: {
              preview: response.preview,
              averageColor: response.averageColor,
            },
          });
        });
        worker.postMessage(payload, transfers);
      });
    },
    [ensureWorker],
  );

  const notify = useCallback(
    async (options: ToastOptions) => {
      const prepared = await formatNotification(options);
      const baseId = prepared.id ?? createId('toast');
      const duration =
        typeof prepared.duration === 'number' ? prepared.duration : DEFAULT_DURATION;
      const sanitizedMeta: ToastMeta | undefined = prepared.meta
        ? {
            ...(prepared.meta.preview ? { preview: prepared.meta.preview } : {}),
            ...(prepared.meta.averageColor ? { averageColor: prepared.meta.averageColor } : {}),
          }
        : undefined;

      let resolvedId = baseId;
      setToasts((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.message === prepared.message && item.actionLabel === prepared.actionLabel,
        );
        if (existingIndex !== -1) {
          const updated = [...prev];
          const existing = { ...updated[existingIndex] };
          resolvedId = existing.id;
          existing.count += 1;
          existing.duration = duration;
          existing.actionLabel = prepared.actionLabel ?? existing.actionLabel;
          existing.onAction = prepared.onAction ?? existing.onAction;
          existing.meta = { ...existing.meta, ...sanitizedMeta };
          if (existing.status === 'visible') {
            existing.visibleSince = Date.now();
          }
          existing.version += 1;
          updated[existingIndex] = existing;
          return promoteToVisible(updated);
        }

        const next: ToastRecord = {
          id: baseId,
          message: prepared.message,
          actionLabel: prepared.actionLabel,
          onAction: prepared.onAction,
          duration,
          count: 1,
          status: 'queued',
          visibleSince: 0,
          version: 0,
          meta: sanitizedMeta,
        };

        return promoteToVisible([...prev, next]);
      });

      return resolvedId;
    },
    [formatNotification],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => promoteToVisible(prev.filter((toast) => toast.id !== id)));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({
      notify,
      dismiss,
      clear,
      toasts,
    }),
    [notify, dismiss, clear, toasts],
  );

  const visibleToasts = useMemo(
    () => toasts.filter((toast) => toast.status === 'visible'),
    [toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex justify-center px-4">
        <ol className="flex w-full max-w-md flex-col gap-3">
          {visibleToasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={dismiss} />
          ))}
        </ol>
      </div>
    </ToastContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useNotifications must be used within a ToastProvider');
  }
  return context;
};
