"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WORKSPACE_LAYOUT_EVENTS,
  getStoredWorkspaceLayout,
  listStoredWorkspaceLayouts,
  saveWorkspaceLayout,
  deleteWorkspaceLayout,
} from "../../utils/windowLayout";

interface WorkspaceLayoutSummary {
  name: string;
  createdAt: number;
  updatedAt: number;
  buckets: string[];
}

interface StoredWorkspaceLayout {
  name: string;
  bucket: string;
  layout: unknown;
}

const formatTimestamp = (value: number): string => {
  if (!Number.isFinite(value)) return "Unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown";
  }
};

const getInitialSummaries = (): WorkspaceLayoutSummary[] => {
  try {
    return listStoredWorkspaceLayouts();
  } catch {
    return [];
  }
};

const isCustomEvent = (event: Event): event is CustomEvent => "detail" in event;

export default function WorkspaceLayoutMenu() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [summaries, setSummaries] = useState<WorkspaceLayoutSummary[]>(() => getInitialSummaries());
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const refreshSummaries = () => {
    setSummaries(getInitialSummaries());
  };

  const closeMenu = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleApplied = (event: Event) => {
      if (!isCustomEvent(event)) return;
      const { success, reason } = event.detail ?? {};
      if (success) {
        setStatus("Workspace applied successfully.");
      } else if (reason === "missing-layout") {
        setStatus("Workspace layout was not provided.");
      } else if (reason === "invalid-layout") {
        setStatus("Saved workspace layout is incompatible with this build.");
      } else {
        setStatus("Unable to apply workspace layout.");
      }
      setPending(false);
    };
    window.addEventListener(WORKSPACE_LAYOUT_EVENTS.applied, handleApplied as EventListener);
    return () => {
      window.removeEventListener(WORKSPACE_LAYOUT_EVENTS.applied, handleApplied as EventListener);
    };
  }, []);

  const requestCurrentLayout = useCallback(async (): Promise<unknown | null> => {
    if (typeof window === "undefined") return null;
    const requestId = `ws-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return await new Promise<unknown | null>((resolve) => {
      const handleResponse = (event: Event) => {
        if (!isCustomEvent(event)) return;
        const { requestId: responseId, layout } = event.detail ?? {};
        if (responseId && responseId !== requestId) {
          return;
        }
        window.removeEventListener(
          WORKSPACE_LAYOUT_EVENTS.response,
          handleResponse as EventListener,
        );
        resolve(layout ?? null);
      };
      window.addEventListener(
        WORKSPACE_LAYOUT_EVENTS.response,
        handleResponse as EventListener,
      );
      window.dispatchEvent(
        new CustomEvent(WORKSPACE_LAYOUT_EVENTS.request, {
          detail: { requestId },
        }),
      );
      window.setTimeout(() => {
        window.removeEventListener(
          WORKSPACE_LAYOUT_EVENTS.response,
          handleResponse as EventListener,
        );
        resolve(null);
      }, 1200);
    });
  }, []);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("Enter a workspace name before saving.");
      return;
    }
    setPending(true);
    const layout = await requestCurrentLayout();
    if (!layout) {
      setStatus("Unable to read the current workspace layout.");
      setPending(false);
      return;
    }
    try {
      saveWorkspaceLayout(trimmed, layout);
      setStatus(`Saved workspace "${trimmed}".`);
      refreshSummaries();
    } catch {
      setStatus("Failed to save workspace layout.");
    }
    setPending(false);
  };

  const handleUpdate = async (target: string) => {
    setPending(true);
    setStatus(`Updating workspace "${target}"...`);
    setName(target);
    const layout = await requestCurrentLayout();
    if (!layout) {
      setStatus("Unable to read the current workspace layout.");
      setPending(false);
      return;
    }
    try {
      saveWorkspaceLayout(target, layout);
      setStatus(`Updated workspace "${target}".`);
      refreshSummaries();
    } catch {
      setStatus("Failed to update workspace layout.");
    }
    setPending(false);
  };

  const handleDelete = (target: string) => {
    const removed = deleteWorkspaceLayout(target);
    if (removed) {
      setStatus(`Deleted workspace "${target}".`);
      refreshSummaries();
    } else {
      setStatus("Workspace was already removed or missing.");
    }
  };

  const handleLoad = (target: string) => {
    if (typeof window === "undefined") {
      setStatus("Workspace loading is only available in the browser.");
      return;
    }
    const viewportWidth = window.innerWidth;
    const stored = getStoredWorkspaceLayout(target, viewportWidth) as StoredWorkspaceLayout | null;
    if (!stored) {
      setStatus("No saved layout for this workspace at the current screen width.");
      return;
    }
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_LAYOUT_EVENTS.apply, {
        detail: { layout: stored.layout, name: target },
      }),
    );
    setStatus(`Applying workspace "${target}"...`);
    setPending(true);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md border border-white/15 bg-[#1e2430] px-3 py-1 text-xs font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161b25]"
      >
        Workspaces
      </button>
      {open ? (
        <div className="absolute right-0 z-[280] mt-2 w-80 origin-top-right rounded-lg border border-white/10 bg-[#111621] p-4 text-white shadow-xl">
          <div className="mb-4 space-y-2 border-b border-white/10 pb-4">
            <label htmlFor="workspace-name" className="block text-xs uppercase tracking-wide text-white/60">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#0c101a] px-2 py-1 text-sm text-white focus:border-[var(--kali-blue)] focus:outline-none"
              placeholder="Blue team layout"
              aria-label="Workspace name"
              disabled={pending}
            />
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-[var(--kali-blue)] px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-white/20"
              disabled={pending}
            >
              Save workspace
            </button>
          </div>
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1 text-sm">
            {summaries.length === 0 ? (
              <p className="text-white/60">No saved workspaces yet. Save the current layout to create one.</p>
            ) : (
              <ul className="space-y-3">
                {summaries.map((summary) => (
                  <li key={summary.name} className="rounded-md border border-white/10 p-3">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{summary.name}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80 hover:bg-white/20"
                          onClick={() => handleLoad(summary.name)}
                          disabled={pending}
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80 hover:bg-white/20"
                          onClick={() => handleUpdate(summary.name)}
                          disabled={pending}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-200 hover:bg-red-500/30"
                          onClick={() => handleDelete(summary.name)}
                          disabled={pending}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-white/60">
                      Updated {formatTimestamp(summary.updatedAt)}
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      Widths: {summary.buckets.length ? summary.buckets.join(", ") : "unknown"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {status ? (
            <p className="mt-4 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
              {status}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={closeMenu}
              className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/20 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
