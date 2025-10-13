"use client";

import Image from "next/image";
import clsx from "clsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { shellActions, useShellStore, type ShellWindow, type WorkspaceId } from "../../hooks/useShellStore";

const WINDOW_DRAG_MIME = "application/x-shell-window-id";
const TEXT_PLAIN_MIME = "text/plain";

const isWindowDrag = (dataTransfer: DataTransfer | null): boolean => {
  if (!dataTransfer) return false;
  const { types } = dataTransfer;
  if (!types) return false;
  if (types.includes(WINDOW_DRAG_MIME)) return true;
  if (types.includes(TEXT_PLAIN_MIME)) return true;
  return false;
};

const resolveDraggedWindowId = (dataTransfer: DataTransfer | null): string | null => {
  if (!dataTransfer) return null;
  const fromCustom = dataTransfer.getData(WINDOW_DRAG_MIME);
  if (typeof fromCustom === "string" && fromCustom) {
    return fromCustom;
  }
  const fromText = dataTransfer.getData(TEXT_PLAIN_MIME);
  if (typeof fromText === "string" && fromText) {
    return fromText;
  }
  return null;
};

const renderWindowPreview = (windowData: ShellWindow) => {
  if (windowData.icon) {
    return (
      <Image
        src={windowData.icon.replace("./", "/")}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 flex-shrink-0 rounded"
      />
    );
  }
  const fallbackLetter = windowData.title?.charAt(0)?.toUpperCase() || "…";
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-slate-700/80 text-sm font-semibold">
      {fallbackLetter}
    </span>
  );
};

interface WorkspaceEntry {
  id: WorkspaceId;
  label: string;
  index: number;
  windows: ShellWindow[];
  isActive: boolean;
  isFocused: boolean;
}

function WorkspaceSwitcher(): JSX.Element | null {
  const {
    open,
    workspaces,
    workspaceWindows,
    windows,
    activeWorkspaceId,
    focusedWorkspaceId,
  } = useShellStore((state) => ({
    open: state.overview.open,
    workspaces: state.workspaces,
    workspaceWindows: state.workspaceWindows,
    windows: state.windows,
    activeWorkspaceId: state.activeWorkspaceId,
    focusedWorkspaceId: state.overview.focusedWorkspaceId ?? state.activeWorkspaceId,
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [dragTarget, setDragTarget] = useState<WorkspaceId | null>(null);

  const workspaceEntries: WorkspaceEntry[] = useMemo(() => {
    return workspaces.map((workspace, index) => {
      const ids = workspaceWindows[workspace.id] ?? [];
      const windowEntries = ids
        .map((windowId) => windows[windowId])
        .filter((entry): entry is ShellWindow => Boolean(entry));
      return {
        id: workspace.id,
        label: workspace.label,
        index,
        windows: windowEntries,
        isActive: workspace.id === activeWorkspaceId,
        isFocused: workspace.id === focusedWorkspaceId,
      };
    });
  }, [workspaces, workspaceWindows, windows, activeWorkspaceId, focusedWorkspaceId]);

  useEffect(() => {
    if (!open) {
      setDragTarget(null);
      return;
    }
    const node = containerRef.current;
    if (node && typeof node.focus === "function") {
      node.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusedId = focusedWorkspaceId ?? activeWorkspaceId;
    if (!focusedId) return;
    const target = itemRefs.current[focusedId];
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }, [open, focusedWorkspaceId, activeWorkspaceId]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          shellActions.focusNextWorkspace();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          shellActions.focusPreviousWorkspace();
          break;
        case "Home":
          event.preventDefault();
          if (workspaces.length > 0) {
            shellActions.focusWorkspace(workspaces[0].id);
          }
          break;
        case "End":
          event.preventDefault();
          if (workspaces.length > 0) {
            shellActions.focusWorkspace(workspaces[workspaces.length - 1].id);
          }
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          shellActions.activateFocusedWorkspace();
          break;
        case "Escape":
          event.preventDefault();
          shellActions.closeWorkspaceOverview();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, workspaces]);

  useEffect(() => {
    if (!open) {
      setDragTarget(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSelect = (workspaceId: WorkspaceId) => {
    shellActions.setActiveWorkspace(workspaceId);
    shellActions.closeWorkspaceOverview();
  };

  const handleDragOver = (workspaceId: WorkspaceId) => (event: React.DragEvent<HTMLButtonElement>) => {
    if (!isWindowDrag(event.dataTransfer)) return;
    event.preventDefault();
    if (dragTarget !== workspaceId) {
      setDragTarget(workspaceId);
      shellActions.focusWorkspace(workspaceId);
    }
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (workspaceId: WorkspaceId) => (event: React.DragEvent<HTMLButtonElement>) => {
    if (!isWindowDrag(event.dataTransfer)) return;
    if (dragTarget === workspaceId) {
      setDragTarget(null);
    }
  };

  const handleDrop = (workspaceId: WorkspaceId) => (event: React.DragEvent<HTMLButtonElement>) => {
    if (!isWindowDrag(event.dataTransfer)) return;
    event.preventDefault();
    const windowId = resolveDraggedWindowId(event.dataTransfer);
    if (windowId) {
      shellActions.moveWindowToWorkspace(windowId, workspaceId);
    }
    setDragTarget(null);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace overview"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-white shadow-2xl backdrop-blur"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Switch workspace</h2>
            <p className="text-xs text-white/60">
              Use the arrow keys to preview, Enter to activate, and Esc to close. Drag windows onto a workspace to move them.
            </p>
          </div>
          <span className="hidden rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white/70 sm:inline-flex">
            Overview
          </span>
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <div
            className="flex min-h-[15rem] gap-4 pr-2"
            role="listbox"
            aria-orientation="horizontal"
            aria-label="Workspaces"
          >
            {workspaceEntries.map((entry) => {
              const hasWindows = entry.windows.length > 0;
              const isDragOver = dragTarget === entry.id;
              const focusRing = entry.isFocused
                ? "ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-900"
                : "";
              const borderHighlight = entry.isActive
                ? "border-sky-400/60 bg-sky-500/10"
                : "border-white/10 hover:border-white/20";
              const dragHighlight = isDragOver ? "border-sky-300/80 bg-sky-500/10" : "";
              return (
                <button
                  key={entry.id}
                  ref={(node) => {
                    itemRefs.current[entry.id] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={entry.isFocused}
                  onClick={() => handleSelect(entry.id)}
                  onMouseEnter={() => shellActions.focusWorkspace(entry.id)}
                  onDragOver={handleDragOver(entry.id)}
                  onDragLeave={handleDragLeave(entry.id)}
                  onDrop={handleDrop(entry.id)}
                  className={clsx(
                    "group relative flex h-60 w-64 flex-shrink-0 flex-col overflow-hidden rounded-2xl border bg-slate-950/40 p-4 text-left transition-all",
                    borderHighlight,
                    dragHighlight,
                    focusRing,
                  )}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2 text-white/90">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/80 text-xs font-semibold text-white/70">
                        {entry.index + 1}
                      </span>
                      {entry.label}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70">
                      {entry.windows.length} {entry.windows.length === 1 ? "window" : "windows"}
                    </span>
                  </div>
                  <div className="mt-4 flex-1 overflow-hidden">
                    <ul className="flex h-full flex-col gap-2 overflow-y-auto pr-1 text-sm" role="list">
                      {hasWindows ? (
                        entry.windows.map((windowEntry) => (
                          <li
                            key={windowEntry.id}
                            className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2 text-white/80"
                          >
                            {renderWindowPreview(windowEntry)}
                            <span className="truncate" title={windowEntry.title}>
                              {windowEntry.title}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-white/60">
                          No windows open
                        </li>
                      )}
                    </ul>
                  </div>
                  {entry.isActive && (
                    <span className="absolute inset-x-4 bottom-4 rounded-full bg-sky-500/20 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-sky-100">
                      Current workspace
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceSwitcher;
