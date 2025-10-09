"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface WorkspaceSummary {
  id: number;
  label: string;
  openWindows: number;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceSummary[];
  activeWorkspace: number;
  onSelect: (workspaceId: number) => void;
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
}: WorkspaceSwitcherProps) {
  const [draggingWindowId, setDraggingWindowId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dropTargetRef = useRef<number | null>(null);
  const draggedWindowRef = useRef<string | null>(null);

  const assignButtonRef = useCallback(
    (index: number) => (node: HTMLButtonElement | null) => {
      buttonRefs.current[index] = node;
    },
    [],
  );

  const clearDropTarget = useCallback(() => {
    dropTargetRef.current = null;
    setDropTarget(null);
  }, []);

  const resolveWorkspaceAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      let hovered: number | null = null;
      buttonRefs.current.forEach((button, index) => {
        if (!button) return;
        const rect = button.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          const workspace = workspaces[index];
          if (workspace) {
            hovered = workspace.id;
          }
        }
      });
      return hovered;
    },
    [workspaces],
  );

  const handleDragStart = useCallback((event: Event) => {
    const detail = (event as CustomEvent)?.detail;
    const windowId = typeof detail?.windowId === "string" ? detail.windowId : null;
    if (!windowId) return;
    draggedWindowRef.current = windowId;
    setDraggingWindowId(windowId);
    clearDropTarget();
  }, [clearDropTarget]);

  const handleDragEnd = useCallback(
    (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const windowId =
        typeof detail?.windowId === "string"
          ? detail.windowId
          : draggedWindowRef.current;
      const targetWorkspaceId = dropTargetRef.current;

      if (
        windowId &&
        targetWorkspaceId !== null &&
        targetWorkspaceId !== activeWorkspace
      ) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("workspace-move-window", {
              detail: {
                windowId,
                sourceWorkspaceId: activeWorkspace,
                targetWorkspaceId,
              },
            }),
          );
        }
      }

      draggedWindowRef.current = null;
      setDraggingWindowId(null);
      clearDropTarget();
    },
    [activeWorkspace, clearDropTarget],
  );

  const handleDragging = useCallback(
    (event: Event) => {
      if (!draggedWindowRef.current) return;
      const detail = (event as CustomEvent)?.detail;
      const clientX = typeof detail?.clientX === "number" ? detail.clientX : null;
      const clientY = typeof detail?.clientY === "number" ? detail.clientY : null;
      if (clientX === null || clientY === null) {
        if (dropTargetRef.current !== null) {
          clearDropTarget();
        }
        return;
      }

      const hovered = resolveWorkspaceAtPoint(clientX, clientY);
      if (hovered !== dropTargetRef.current) {
        dropTargetRef.current = hovered;
        setDropTarget(hovered);
      }
    },
    [clearDropTarget, resolveWorkspaceAtPoint],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    window.addEventListener("desktop-window-drag-start", handleDragStart);
    window.addEventListener("desktop-window-dragging", handleDragging);
    window.addEventListener("desktop-window-drag-end", handleDragEnd);

    return () => {
      window.removeEventListener("desktop-window-drag-start", handleDragStart);
      window.removeEventListener("desktop-window-dragging", handleDragging);
      window.removeEventListener("desktop-window-drag-end", handleDragEnd);
    };
  }, [handleDragEnd, handleDragStart, handleDragging]);

  const navAriaLabel = useMemo(
    () => (draggingWindowId ? "Workspace switcher (drop target active)" : "Workspace switcher"),
    [draggingWindowId],
  );

  useEffect(() => {
    buttonRefs.current.length = workspaces.length;
  }, [workspaces.length]);

  if (workspaces.length === 0) return null;

  return (
    <nav
      aria-label={navAriaLabel}
      data-drag-active={draggingWindowId ? "true" : undefined}
      className="flex items-center overflow-hidden rounded-md border border-white/10 bg-[#1e2430]"
    >
      {workspaces.map((workspace, index) => {
        const isActive = workspace.id === activeWorkspace;
        const tabIndex = workspace.id === activeWorkspace ? 0 : -1;
        const isDropTarget = dropTarget === workspace.id;
        return (
          <button
            key={workspace.id}
            type="button"
            tabIndex={tabIndex}
            aria-pressed={isActive}
            aria-label={formatAriaLabel(workspace)}
            aria-dropeffect={draggingWindowId ? "move" : undefined}
            onClick={() => onSelect(workspace.id)}
            data-drop-target={isDropTarget ? "true" : undefined}
            className={`relative flex h-8 min-w-[2.25rem] items-center justify-center px-3 text-xs font-medium text-white/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161b25] ${
              index > 0 ? "border-l border-white/10" : ""
            } ${isActive ? "text-white" : "hover:text-white"} ${
              isDropTarget ? "ring-2 ring-[var(--kali-blue)] ring-offset-2 ring-offset-[#161b25]" : ""
            } ${draggingWindowId ? "transition-shadow" : ""}`}
            ref={assignButtonRef(index)}
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

