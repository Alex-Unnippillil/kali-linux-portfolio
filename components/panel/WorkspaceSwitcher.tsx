"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";

export interface WorkspaceSummary {
  id: number;
  label: string;
  openWindows: number;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceSummary[];
  activeWorkspace: number;
  onSelect: (workspaceId: number) => void;
  onRename?: (workspaceId: number, label: string) => void;
}

function formatAriaLabel(workspace: WorkspaceSummary) {
  const count = workspace.openWindows;
  const windowsSuffix =
    count === 0
      ? ""
      : count === 1
      ? ", 1 window"
      : `, ${count} windows`;
  return `${workspace.label}${windowsSuffix}`;
}

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSelect,
  onRename,
}: WorkspaceSwitcherProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [originalLabel, setOriginalLabel] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const finishingRenameRef = useRef(false);

  useEffect(() => {
    if (editingId === null) return;
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, [editingId]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  const focusWorkspaceButton = useCallback((workspaceId: number) => {
    const target = buttonRefs.current.get(workspaceId);
    if (target) {
      requestAnimationFrame(() => {
        target.focus();
      });
    }
  }, []);

  const beginRename = useCallback(
    (workspace: WorkspaceSummary) => {
      cancelLongPress();
      finishingRenameRef.current = false;
      setEditingId(workspace.id);
      setDraftLabel(workspace.label);
      setOriginalLabel(workspace.label);
    },
    [cancelLongPress],
  );

  const finishRename = useCallback(
    (commit: boolean) => {
      if (editingId === null || finishingRenameRef.current) return;
      finishingRenameRef.current = true;
      const nextLabel = draftLabel.trim();
      const baseline = originalLabel.trim();
      const workspaceId = editingId;
      setEditingId(null);
      setDraftLabel("");
      setOriginalLabel("");

      if (commit && nextLabel && nextLabel !== baseline) {
        onRename?.(workspaceId, nextLabel);
      }

      focusWorkspaceButton(workspaceId);
      setTimeout(() => {
        finishingRenameRef.current = false;
      }, 0);
    },
    [draftLabel, editingId, focusWorkspaceButton, onRename, originalLabel],
  );

  const handleRenameSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      finishRename(true);
    },
    [finishRename],
  );

  const handleRenameBlur = useCallback(() => {
    finishRename(true);
  }, [finishRename]);

  const handleRenameKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finishRename(false);
      }
    },
    [finishRename],
  );

  const handleContextMenu = useCallback(
    (workspace: WorkspaceSummary, event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (editingId !== null) return;
      beginRename(workspace);
    },
    [beginRename, editingId],
  );

  const handlePointerDown = useCallback(
    (workspace: WorkspaceSummary) => (event: PointerEvent<HTMLButtonElement>) => {
      if (editingId !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      cancelLongPress();
      longPressTimer.current = setTimeout(() => {
        beginRename(workspace);
      }, 600);
    },
    [beginRename, cancelLongPress, editingId],
  );

  const handlePointerEnd = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const handleKeyDown = useCallback(
    (workspace: WorkspaceSummary) => (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "F2") {
        event.preventDefault();
        beginRename(workspace);
      }
    },
    [beginRename],
  );

  if (workspaces.length === 0) return null;

  return (
    <nav
      aria-label="Workspace switcher"
      className="flex items-center overflow-hidden rounded-md border border-white/10 bg-[#1e2430]"
    >
      {workspaces.map((workspace, index) => {
        const isActive = workspace.id === activeWorkspace;
        const tabIndex = workspace.id === activeWorkspace ? 0 : -1;

        if (editingId === workspace.id) {
          return (
            <form
              key={workspace.id}
              onSubmit={handleRenameSubmit}
              className={`relative flex h-8 min-w-[2.25rem] items-center justify-center px-2 text-xs ${
                index > 0 ? "border-l border-white/10" : ""
              }`}
            >
              <label className="sr-only" htmlFor={`workspace-rename-${workspace.id}`}>
                Rename {workspace.label}
              </label>
              <input
                ref={inputRef}
                id={`workspace-rename-${workspace.id}`}
                value={draftLabel}
                onChange={event => setDraftLabel(event.target.value)}
                onBlur={handleRenameBlur}
                onKeyDown={handleRenameKeyDown}
                aria-label={`Rename ${workspace.label}`}
                className="h-6 w-28 rounded-md border border-white/20 bg-[#121722] px-2 text-xs text-white focus:border-[var(--kali-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]"
              />
            </form>
          );
        }

        return (
          <button
            key={workspace.id}
            ref={node => {
              if (node) {
                buttonRefs.current.set(workspace.id, node);
              } else {
                buttonRefs.current.delete(workspace.id);
              }
            }}
            type="button"
            tabIndex={tabIndex}
            aria-pressed={isActive}
            aria-label={formatAriaLabel(workspace)}
            onClick={() => onSelect(workspace.id)}
            onContextMenu={event => handleContextMenu(workspace, event)}
            onPointerDown={handlePointerDown(workspace)}
            onPointerUp={handlePointerEnd}
            onPointerLeave={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={handleKeyDown(workspace)}
            className={`relative flex h-8 min-w-[2.25rem] items-center justify-center px-3 text-xs font-medium text-white/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161b25] ${
              index > 0 ? "border-l border-white/10" : ""
            } ${isActive ? "text-white" : "hover:text-white"}`}
          >
            <span>{index + 1}</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[var(--kali-blue)] transition-opacity ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
            {workspace.openWindows > 0 && !isActive && (
              <span className="pointer-events-none absolute -top-1 right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/10 px-1 text-[10px] text-white/80">
                {workspace.openWindows}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

