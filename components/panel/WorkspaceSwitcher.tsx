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
  onShift: (direction: number) => void;
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
  onShift,
}: WorkspaceSwitcherProps) {
  if (workspaces.length === 0) return null;

  const activeId = `workspace-dot-${activeWorkspace}`;

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      const { deltaX, deltaY } = event;
      const magnitude = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
      if (!magnitude) return;
      event.preventDefault();
      onShift(magnitude > 0 ? 1 : -1);
    },
    [onShift],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!event.ctrlKey || !event.altKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onShift(-1);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onShift(1);
      }
    },
    [onShift],
  );

  return (
    <nav
      aria-label="Workspace switcher"
      aria-activedescendant={activeId}
      role="tablist"
      aria-orientation="horizontal"
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-1.5 rounded-full bg-black/50 px-1.5 py-1"
    >
      {workspaces.map((workspace, index) => {
        const isActive = workspace.id === activeWorkspace;
        const tabIndex = workspace.id === activeWorkspace ? 0 : -1;
        const controlId = `workspace-dot-${workspace.id}`;
        return (
          <button
            key={workspace.id}
            type="button"
            tabIndex={tabIndex}
            aria-pressed={isActive}
            aria-label={formatAriaLabel(workspace)}
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            role="tab"
            id={controlId}
            title={`${index + 1}`}
            onClick={() => onSelect(workspace.id)}
            className={`relative flex h-6 w-6 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
              isActive
                ? "bg-white/90 text-black shadow-inner"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            <span className="sr-only">{`Workspace ${index + 1}`}</span>
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full transition-transform ${
                isActive ? "scale-110 bg-[var(--kali-blue)]" : "bg-white/70"
              }`}
            />
            {workspace.openWindows > 0 && !isActive && (
              <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/10 px-1 text-[10px] text-white/80">
                {workspace.openWindows}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

