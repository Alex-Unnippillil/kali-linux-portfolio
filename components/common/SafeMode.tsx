"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import usePersistentState from "../../hooks/usePersistentState";
import useNotifications from "../../hooks/useNotifications";

interface SafeModeBlockedAction {
  id: string;
  action: string;
  summary: string;
  details?: string;
  timestamp: number;
}

interface SafeModeDialogState {
  kind: "disable" | "enable";
  message?: string;
  source?: string;
}

export interface GuardedActionOptions {
  action: string;
  summary?: string;
  details?: string;
  appId?: string;
  openDialogOnBlock?: boolean;
}

export interface SafeModeContextValue {
  enabled: boolean;
  lastBlockedAction: SafeModeBlockedAction | null;
  requestDisable: (options?: Partial<SafeModeDialogState>) => void;
  requestEnable: (options?: Partial<SafeModeDialogState>) => void;
  guardSensitiveAction: (options: GuardedActionOptions) => boolean;
}

const defaultBlockedSummary =
  "This action is locked while Safe Mode is active. Review the legal guidance before proceeding.";

export const SafeModeContext =
  createContext<SafeModeContextValue | null>(null);

const ShieldWatermark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    role="presentation"
  >
    <path
      fill="currentColor"
      d="M12 2c-.3 0-.6.1-.9.2l-6 2.2c-.7.3-1.1.9-1.1 1.6 0 7 3.6 11.5 7.1 13.7.6.4 1.3.4 1.9 0 3.5-2.2 7.1-6.7 7.1-13.7 0-.7-.4-1.3-1.1-1.6l-6-2.2c-.3-.1-.6-.2-.9-.2Zm3.2 7.3-4.6 4.7a.9.9 0 0 1-1.3 0l-2-2a.9.9 0 0 1 1.3-1.2l1.3 1.3 4-4a.9.9 0 1 1 1.3 1.2Z"
    />
  </svg>
);

export const SafeModeProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [enabled, setEnabled] = usePersistentState<boolean>(
    "desktop:safe-mode",
    true,
    (value): value is boolean => typeof value === "boolean",
  );
  const [dialog, setDialog] = useState<SafeModeDialogState | null>(null);
  const [ackDisable, setAckDisable] = useState(false);
  const [lastBlockedAction, setLastBlockedAction] =
    useState<SafeModeBlockedAction | null>(null);
  const [toastBlock, setToastBlock] = useState<SafeModeBlockedAction | null>(
    null,
  );
  const dismissTimer = useRef<number | null>(null);
  const { pushNotification } = useNotifications();

  const clearToastTimer = useCallback(() => {
    if (dismissTimer.current !== null) {
      window.clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!toastBlock) {
      clearToastTimer();
      return;
    }
    clearToastTimer();
    dismissTimer.current = window.setTimeout(() => {
      setToastBlock(null);
    }, 6000);
    return () => {
      clearToastTimer();
    };
  }, [toastBlock, clearToastTimer]);

  useEffect(() => () => clearToastTimer(), [clearToastTimer]);

  const requestDisable = useCallback(
    (options?: Partial<SafeModeDialogState>) => {
      if (!enabled) return;
      setAckDisable(false);
      setDialog({ kind: "disable", ...options });
    },
    [enabled],
  );

  const requestEnable = useCallback(
    (options?: Partial<SafeModeDialogState>) => {
      if (enabled) return;
      setDialog({ kind: "enable", ...options });
    },
    [enabled],
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
    setAckDisable(false);
  }, []);

  const confirmDisable = useCallback(() => {
    setEnabled(false);
    setAckDisable(false);
    setDialog(null);
    setToastBlock(null);
    pushNotification({
      appId: "safe-mode",
      title: "Safe Mode disabled",
      body: "Sensitive simulations are now unlocked. Operate within authorized environments only.",
      priority: "high",
      hints: {
        urgency: 1,
        "x-kali-category": "safe-mode",
        direction: "disabled",
      },
    });
  }, [pushNotification, setEnabled]);

  const confirmEnable = useCallback(() => {
    setEnabled(true);
    setDialog(null);
    pushNotification({
      appId: "safe-mode",
      title: "Safe Mode enabled",
      body: "Sensitive actions stay sandboxed until you exit Safe Mode.",
      priority: "normal",
      hints: {
        "x-kali-category": "safe-mode",
        direction: "enabled",
      },
    });
  }, [pushNotification, setEnabled]);

  const guardSensitiveAction = useCallback(
    (options: GuardedActionOptions) => {
      if (!enabled) return true;
      const block: SafeModeBlockedAction = {
        id: `safe-block-${Date.now()}`,
        action: options.action,
        summary: options.summary || defaultBlockedSummary,
        details: options.details,
        timestamp: Date.now(),
      };
      setLastBlockedAction(block);
      setToastBlock(block);
      pushNotification({
        appId: options.appId || "safe-mode",
        title: "Blocked by Safe Mode",
        body: block.summary,
        priority: "high",
        hints: {
          urgency: 2,
          "x-kali-category": "safe-mode",
          action: options.action,
        },
      });
      if (options.openDialogOnBlock) {
        requestDisable({ message: options.details, source: options.appId });
      }
      return false;
    },
    [enabled, pushNotification, requestDisable],
  );

  const contextValue = useMemo<SafeModeContextValue>(
    () => ({
      enabled,
      lastBlockedAction,
      requestDisable,
      requestEnable,
      guardSensitiveAction,
    }),
    [enabled, guardSensitiveAction, lastBlockedAction, requestDisable, requestEnable],
  );

  return (
    <SafeModeContext.Provider value={contextValue}>
      {children}
      {enabled && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[70] w-full max-w-3xl -translate-x-1/2 px-4">
          <div className="pointer-events-auto rounded-xl border border-ubt-blue/40 bg-ubt-blue/15 px-4 py-3 text-sm text-white shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ubt-blue/70">
                  Safe Mode Active
                </p>
                <p className="text-sm text-slate-100">
                  Sensitive simulations and destructive commands are locked. Review the usage policy before disabling Safe Mode.
                </p>
                {lastBlockedAction && (
                  <p className="text-xs text-ubt-blue/60">
                    Last blocked action: {lastBlockedAction.summary}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => requestDisable({})}
                  className="rounded-lg border border-ubt-blue/60 bg-ubt-blue/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ubt-blue/30"
                >
                  Manage Safe Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {enabled && (
        <div className="pointer-events-none fixed inset-0 z-[20] flex items-center justify-center text-ubt-blue/10">
          <div className="flex flex-col items-center gap-3">
            <ShieldWatermark className="h-24 w-24" />
            <span className="text-sm font-semibold uppercase tracking-[0.4em]">Safe Mode</span>
          </div>
        </div>
      )}

      {toastBlock && (
        <div className="fixed bottom-6 left-1/2 z-[75] w-full max-w-md -translate-x-1/2 px-4">
          <div className="rounded-lg border border-ubt-blue/40 bg-black/85 px-4 py-3 text-sm text-slate-100 shadow-lg backdrop-blur">
            <p className="font-semibold text-white">Blocked by Safe Mode</p>
            <p className="mt-1 text-xs text-slate-200">{toastBlock.summary}</p>
            {toastBlock.details && (
              <p className="mt-1 text-xs text-slate-400">{toastBlock.details}</p>
            )}
            <div className="mt-3 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setToastBlock(null)}
                className="rounded border border-white/20 px-2 py-1 text-slate-200 transition hover:bg-white/10"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setToastBlock(null);
                  requestDisable({ message: toastBlock.details, source: toastBlock.action });
                }}
                className="rounded bg-ubt-blue px-2 py-1 font-semibold text-white transition hover:bg-ubt-blue/90"
              >
                Review Safe Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur"
        >
          <div className="max-w-lg rounded-xl bg-slate-900 p-6 text-slate-100 shadow-2xl">
            {dialog.kind === "disable" ? (
              <>
                <h2 className="text-lg font-semibold text-white">Exit Safe Mode</h2>
                <p className="mt-2 text-sm text-slate-200">
                  Safe Mode prevents offensive tooling from running without supervision. Disabling it unlocks simulated attacks and exploit replays. Proceed only if you are in a controlled lab and understand the legal boundaries.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
                  <li>All network and exploitation features remain demonstrations only.</li>
                  <li>Never target systems without explicit authorization.</li>
                  <li>Review organizational policies and local laws.</li>
                </ul>
                {dialog.message && (
                  <p className="mt-3 rounded-md border border-ubt-blue/40 bg-ubt-blue/10 p-3 text-xs text-ubt-blue/80">
                    {dialog.message}
                  </p>
                )}
                <label className="mt-4 flex items-start gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={ackDisable}
                    onChange={(event) => setAckDisable(event.target.checked)}
                    className="mt-0.5"
                    aria-label="Acknowledge Safe Mode exit requirements"
                  />
                  <span>I acknowledge the responsibilities and legal requirements before exiting Safe Mode.</span>
                </label>
                <div className="mt-5 flex justify-end gap-2 text-sm">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded border border-white/20 px-3 py-1.5 text-slate-200 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDisable}
                    disabled={!ackDisable}
                    className="rounded bg-ubt-blue px-3 py-1.5 font-semibold text-white transition enabled:hover:bg-ubt-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Exit Safe Mode
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white">Enable Safe Mode</h2>
                <p className="mt-2 text-sm text-slate-200">
                  Safe Mode locks destructive actions so the portfolio stays educational. Enable it whenever you share the environment or want extra guardrails.
                </p>
                {dialog.message && (
                  <p className="mt-3 rounded-md border border-ubt-blue/40 bg-ubt-blue/10 p-3 text-xs text-ubt-blue/80">
                    {dialog.message}
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-2 text-sm">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded border border-white/20 px-3 py-1.5 text-slate-200 transition hover:bg-white/10"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={confirmEnable}
                    className="rounded bg-ubt-blue px-3 py-1.5 font-semibold text-white transition hover:bg-ubt-blue/90"
                  >
                    Enable Safe Mode
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </SafeModeContext.Provider>
  );
};

export const useSafeMode = (): SafeModeContextValue => {
  const ctx = useContext(SafeModeContext);
  if (!ctx) {
    throw new Error("useSafeMode must be used within a SafeModeProvider");
  }
  return ctx;
};

export default SafeModeProvider;
