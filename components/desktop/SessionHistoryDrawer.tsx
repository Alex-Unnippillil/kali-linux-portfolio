import React, { useEffect, useMemo, useRef } from "react";
import {
  DesktopHistoryEntry,
  groupHistoryEntries,
  formatHistoryTimestamp,
} from "./history";

interface SessionHistoryDrawerProps {
  open: boolean;
  entries: DesktopHistoryEntry[];
  onClose: () => void;
  onJump: (entry: DesktopHistoryEntry) => void;
  autoFocus?: boolean;
}

export default function SessionHistoryDrawer({
  open,
  entries,
  onClose,
  onJump,
  autoFocus = false,
}: SessionHistoryDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const groups = useMemo(() => groupHistoryEntries(entries), [entries]);

  useEffect(() => {
    if (open && autoFocus) {
      closeButtonRef.current?.focus();
    }
  }, [open, autoFocus]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="presentation"
      aria-hidden={!open}
      className="fixed inset-0 z-[70] flex items-end justify-end bg-black/30 backdrop-blur"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Session history"
        className="m-4 w-full max-w-md rounded-xl bg-slate-900/95 text-white shadow-2xl ring-1 ring-white/10"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Session history</h2>
            <p className="text-xs text-slate-300">Review recently opened and closed windows.</p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-white/80 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Close
          </button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm">
          {groups.length === 0 ? (
            <p className="py-6 text-center text-slate-300">No session activity yet.</p>
          ) : (
            <ul className="space-y-4">
              {groups.map((group) => (
                <li key={group.label} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {group.label}
                  </h3>
                  <ul className="space-y-1.5">
                    {group.entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                      >
                        <div>
                          <p className="font-medium">
                            {entry.action === "open" ? "Opened" : "Closed"} {entry.title}
                          </p>
                          <p className="text-xs text-slate-300">
                            {formatHistoryTimestamp(entry.timestamp)} · Workspace {entry.workspace + 1}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onJump(entry)}
                          className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200 transition hover:bg-cyan-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        >
                          Jump back
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
