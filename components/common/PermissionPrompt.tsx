"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Toast from "../ui/Toast";
import usePersistentState from "../../hooks/usePersistentState";

export type PermissionId =
  | "notifications"
  | "bluetooth"
  | "usb"
  | "serial"
  | "motion";

export type PermissionStatus = "unknown" | "granted" | "denied";

export interface PermissionEntry {
  permission: PermissionId;
  status: Exclude<PermissionStatus, "unknown">;
  title: string;
  message: string;
  appNames: string[];
  updatedAt: number;
}

interface PermissionRequestOptions {
  permission: PermissionId;
  appName: string;
  title: string;
  message: string;
  confirmLabel?: string;
  denyLabel?: string;
  successMessage?: string;
  failureMessage?: string;
  denyMessage?: string;
  details?: string[];
  request?: () =>
    | void
    | boolean
    | "granted"
    | "denied"
    | Promise<void | boolean | "granted" | "denied">;
  onDenied?: () => void;
}

interface PermissionQueueItem extends PermissionRequestOptions {
  id: string;
  resolve: (granted: boolean) => void;
}

type PermissionStore = Partial<Record<PermissionId, PermissionEntry>>;

export interface PermissionContextValue {
  requestPermission: (options: PermissionRequestOptions) => Promise<boolean>;
  revokePermission: (permission: PermissionId) => void;
  resetPermissions: () => void;
  getStatus: (permission: PermissionId) => PermissionStatus;
  entries: PermissionEntry[];
}

export const PermissionContext =
  createContext<PermissionContextValue | null>(null);

const normalizeDecision = (value: unknown): boolean => {
  if (typeof value === "string") return value === "granted";
  if (typeof value === "boolean") return value;
  if (value === null) return false;
  if (typeof value === "undefined") return true;
  return true;
};

const PermissionPromptProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [store, setStore, resetStore] = usePersistentState<PermissionStore>(
    "permission-store",
    () => ({} as PermissionStore),
  );
  const [queue, setQueue] = useState<PermissionQueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeRequest = queue[0] ?? null;

  const requestPermission = useCallback(
    (options: PermissionRequestOptions) => {
      const existing = store[options.permission];
      if (existing?.status === "granted") {
        if (!existing.appNames.includes(options.appName)) {
          setStore((prev) => {
            const current = prev[options.permission];
            if (!current || current.status !== "granted") return prev;
            if (current.appNames.includes(options.appName)) return prev;
            return {
              ...prev,
              [options.permission]: {
                ...current,
                appNames: [...current.appNames, options.appName],
                updatedAt: Date.now(),
              },
            };
          });
        }
        return Promise.resolve(true);
      }

      return new Promise<boolean>((resolve) => {
        setQueue((prev) => [
          ...prev,
          {
            ...options,
            id: `${options.permission}-${Date.now()}-${Math.random()}`,
            resolve,
          },
        ]);
      });
    },
    [setStore, store],
  );

  const getStatus = useCallback(
    (permission: PermissionId): PermissionStatus =>
      store[permission]?.status ?? "unknown",
    [store],
  );

  const updateEntry = useCallback(
    (
      permission: PermissionId,
      updater: (previous?: PermissionEntry) => PermissionEntry | undefined,
    ) => {
      setStore((prev) => {
        const next = { ...prev } as PermissionStore;
        const updated = updater(prev[permission]);
        if (!updated) {
          delete next[permission];
        } else {
          next[permission] = updated;
        }
        return next;
      });
    },
    [setStore],
  );

  const handleSuccess = useCallback(
    (item: PermissionQueueItem) => {
      updateEntry(item.permission, (previous) => {
        const names = new Set(previous?.appNames ?? []);
        names.add(item.appName);
        return {
          permission: item.permission,
          status: "granted",
          title: item.title,
          message: item.message,
          appNames: Array.from(names),
          updatedAt: Date.now(),
        };
      });
      setToastMessage(
        item.successMessage ?? `${item.title} granted to ${item.appName}.`,
      );
    },
    [updateEntry],
  );

  const handleFailure = useCallback(
    (item: PermissionQueueItem, message?: string) => {
      updateEntry(item.permission, (previous) => {
        const names = new Set(previous?.appNames ?? []);
        names.add(item.appName);
        return {
          permission: item.permission,
          status: "denied",
          title: item.title,
          message: item.message,
          appNames: Array.from(names),
          updatedAt: Date.now(),
        };
      });
      setToastMessage(
        message ??
          item.failureMessage ??
          `${item.title} denied for ${item.appName}.`,
      );
      item.onDenied?.();
    },
    [updateEntry],
  );

  const handleAllow = useCallback(async () => {
    if (!activeRequest) return;
    setProcessing(true);
    let granted = true;
    try {
      if (activeRequest.request) {
        const result = await activeRequest.request();
        granted = normalizeDecision(result);
      }
    } catch (err) {
      console.error("Permission request failed", err);
      granted = false;
    }

    if (granted) {
      handleSuccess(activeRequest);
      activeRequest.resolve(true);
    } else {
      handleFailure(activeRequest);
      activeRequest.resolve(false);
    }

    setQueue((prev) => prev.slice(1));
    setProcessing(false);
  }, [activeRequest, handleFailure, handleSuccess]);

  const handleDeny = useCallback(() => {
    if (!activeRequest) return;
    handleFailure(activeRequest, activeRequest.denyMessage);
    activeRequest.resolve(false);
    setQueue((prev) => prev.slice(1));
  }, [activeRequest, handleFailure]);

  useEffect(() => {
    if (!activeRequest) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!processing) handleDeny();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activeRequest, handleDeny, processing]);

  const allowButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRequest) {
      allowButtonRef.current?.focus();
    }
  }, [activeRequest]);

  const revokePermission = useCallback(
    (permission: PermissionId) => {
      const entry = store[permission];
      updateEntry(permission, () => undefined);
      if (entry) {
        setToastMessage(`${entry.title} reset.`);
      }
    },
    [store, updateEntry],
  );

  const resetPermissions = useCallback(() => {
    if (Object.keys(store).length === 0) return;
    resetStore();
    setToastMessage("All permission grants have been cleared.");
  }, [resetStore, store]);

  const entries = useMemo(() => Object.values(store), [store]);

  const value = useMemo<PermissionContextValue>(
    () => ({
      requestPermission,
      revokePermission,
      resetPermissions,
      getStatus,
      entries,
    }),
    [
      entries,
      getStatus,
      requestPermission,
      resetPermissions,
      revokePermission,
    ],
  );

  const dialogId = activeRequest?.id ?? "permission-dialog";
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;

  return (
    <PermissionContext.Provider value={value}>
      {children}
      {activeRequest ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md rounded-md bg-gray-900 p-5 text-white shadow-lg"
          >
            <h2 id={titleId} className="text-lg font-semibold">
              {activeRequest.title}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm text-gray-300">
              {activeRequest.message}
            </p>
            {activeRequest.details?.length ? (
              <ul className="mt-3 space-y-1 text-left text-xs text-gray-300">
                {activeRequest.details.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-gray-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeny}
                disabled={processing}
                className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600 disabled:opacity-50"
              >
                {activeRequest.denyLabel ?? "Deny"}
              </button>
              <button
                type="button"
                ref={allowButtonRef}
                onClick={handleAllow}
                disabled={processing}
                className="rounded bg-ub-orange px-4 py-2 text-sm font-medium text-white transition hover:bg-ubt-grey disabled:opacity-50"
              >
                {processing
                  ? "Processing..."
                  : activeRequest.confirmLabel ?? "Allow"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toastMessage ? (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      ) : null}
    </PermissionContext.Provider>
  );
};

export default PermissionPromptProvider;
