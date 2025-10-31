"use client";

import React from "react";

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

const SWIPE_THRESHOLD = 40;

type SwipeTrackingState = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  pointerId: number | null;
  isTracking: boolean;
  preventClick: boolean;
};

const INITIAL_SWIPE_STATE: SwipeTrackingState = {
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  pointerId: null,
  isTracking: false,
  preventClick: false,
};

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSelect,
}: WorkspaceSwitcherProps) {
  const hasWorkspaces = workspaces.length > 0;

  const activeIndex = React.useMemo(
    () => workspaces.findIndex((workspace) => workspace.id === activeWorkspace),
    [workspaces, activeWorkspace]
  );
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const swipeState = React.useRef<SwipeTrackingState>({ ...INITIAL_SWIPE_STATE });

  const focusWorkspace = React.useCallback((index: number) => {
    const scheduleFocus =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0);

    scheduleFocus(() => {
      buttonRefs.current[index]?.focus();
    });
  }, []);

  const selectByOffset = React.useCallback(
    (offset: number) => {
      if (activeIndex === -1 || workspaces.length === 0) return;
      const nextIndex = (activeIndex + offset + workspaces.length) % workspaces.length;
      const nextWorkspace = workspaces[nextIndex];
      if (nextWorkspace) {
        onSelect(nextWorkspace.id);
        focusWorkspace(nextIndex);
      }
    },
    [activeIndex, focusWorkspace, onSelect, workspaces]
  );

  const handleArrowKey = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        selectByOffset(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        selectByOffset(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        if (workspaces.length > 0) {
          onSelect(workspaces[0].id);
          focusWorkspace(0);
        }
      } else if (event.key === "End") {
        event.preventDefault();
        const lastIndex = workspaces.length - 1;
        if (lastIndex >= 0) {
          onSelect(workspaces[lastIndex].id);
          focusWorkspace(lastIndex);
        }
      } else {
        // Ensure tab order stays consistent when focus shifts programmatically.
        buttonRefs.current[index] = event.currentTarget;
      }
    },
    [focusWorkspace, onSelect, selectByOffset, workspaces]
  );

  const beginTracking = (clientX: number, clientY: number, pointerId: number | null) => {
    swipeState.current = {
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      pointerId,
      isTracking: true,
      preventClick: false,
    };
  };

  const updateTracking = (clientX: number, clientY: number) => {
    if (!swipeState.current.isTracking) return;
    swipeState.current = {
      ...swipeState.current,
      lastX: clientX,
      lastY: clientY,
    };
  };

  const endTracking = (shouldEvaluate: boolean) => {
    const state = swipeState.current;
    let preventClick = state.preventClick;

    if (shouldEvaluate && state.isTracking) {
      const deltaX = state.lastX - state.startX;
      const deltaY = state.lastY - state.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > SWIPE_THRESHOLD && absX > absY) {
        selectByOffset(deltaX < 0 ? 1 : -1);
        preventClick = true;
      }
    }

    swipeState.current = {
      ...INITIAL_SWIPE_STATE,
      preventClick,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      endTracking(false);
      return;
    }

    beginTracking(event.clientX, event.clientY, event.pointerId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeState.current.isTracking || swipeState.current.pointerId !== event.pointerId) {
      return;
    }

    updateTracking(event.clientX, event.clientY);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeState.current.isTracking || swipeState.current.pointerId !== event.pointerId) {
      endTracking(false);
      return;
    }

    updateTracking(event.clientX, event.clientY);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    endTracking(true);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeState.current.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    endTracking(false);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (swipeState.current.isTracking) return;
    const touch = event.touches[0];
    if (!touch) return;
    beginTracking(touch.clientX, touch.clientY, null);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    updateTracking(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (touch) {
      updateTracking(touch.clientX, touch.clientY);
    }
    endTracking(true);
  };

  const handleTouchCancel = () => {
    endTracking(false);
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (swipeState.current.preventClick) {
      event.stopPropagation();
      event.preventDefault();
      swipeState.current.preventClick = false;
    }
  };

  if (!hasWorkspaces) return null;

  return (
    <nav
      aria-label="Workspace switcher"
      className="flex items-center gap-3 overflow-hidden rounded-full border border-white/10 bg-slate-950/65 px-1.5 py-1 shadow-[0_16px_36px_-28px_rgba(2,6,23,0.95)] backdrop-blur-md"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClickCapture={handleClickCapture}
    >
      <div className="flex items-center gap-1">
        {workspaces.map((workspace, index) => {
          const isActive = workspace.id === activeWorkspace;
          const tabIndex = workspace.id === activeWorkspace ? 0 : -1;
          return (
            <button
              key={workspace.id}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              type="button"
              tabIndex={tabIndex}
              aria-pressed={isActive}
              aria-label={formatAriaLabel(workspace)}
              onClick={() => onSelect(workspace.id)}
              onKeyDown={(event) => handleArrowKey(event, index)}
              className={`group relative flex h-8 min-w-[2.25rem] items-center justify-center rounded-full px-3 text-xs font-semibold tracking-wide transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isActive
                  ? "bg-cyan-500/20 text-white shadow-[0_0_0_1px_rgba(148,210,255,0.35)]"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{index + 1}</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-[var(--kali-blue)] transition-all duration-150 ${
                  isActive ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0"
                }`}
              />
              {workspace.openWindows > 0 && !isActive && (
                <span className="pointer-events-none absolute -top-1 right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/15 px-1 text-[10px] text-white/80 shadow-[0_2px_8px_-6px_rgba(2,6,23,0.9)]">
                  {workspace.openWindows}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="flex items-center gap-1 pr-1">
        {workspaces.map((workspace) => (
          <span
            key={`indicator-${workspace.id}`}
            data-testid="workspace-indicator-dot"
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-150 ${
              workspace.id === activeWorkspace
                ? "bg-[var(--kali-blue)] shadow-[0_0_0_4px_rgba(37,99,235,0.25)]"
                : "bg-white/25"
            }`}
          />
        ))}
      </div>
    </nav>
  );
}

