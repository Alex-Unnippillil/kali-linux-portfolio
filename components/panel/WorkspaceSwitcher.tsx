"use client";

import React, { useCallback } from "react";

export interface WorkspaceSummary {
  id: number;
  label: string;
  openWindows: number;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceSummary[];
  activeWorkspace: number;
  onSelect: (workspaceId: number) => void;
  onCycle?: (direction: number) => void;
}

function getWorkspaceLabel(workspace: WorkspaceSummary) {
  if (workspace.label) return workspace.label;
  const index = Number.isFinite(workspace.id) ? workspace.id + 1 : 0;
  return index > 0 ? `Workspace ${index}` : "Workspace";
}

function formatWindowSummary(count: number) {
  if (count === 0) return "No windows open";
  if (count === 1) return "1 window open";
  return `${count} windows open`;
}

function formatAriaLabel(workspace: WorkspaceSummary) {
  const label = getWorkspaceLabel(workspace);
  const windowSummary = formatWindowSummary(workspace.openWindows);
  return `${label} • ${windowSummary}`;
}

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSelect,
  onCycle,
}: WorkspaceSwitcherProps) {
  if (workspaces.length === 0) return null;

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!onCycle) return;
      const { deltaX, deltaY } = event;
      if (deltaX === 0 && deltaY === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const primaryDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      if (primaryDelta === 0) return;
      const direction = primaryDelta > 0 ? 1 : -1;
      onCycle(direction);
    },
    [onCycle]
  );

  return (
    <nav
      aria-label="Workspace switcher"
      className="flex items-center gap-1.5 rounded-full bg-black/50 px-1.5 py-1"
      onWheel={handleWheel}
    >
      {workspaces.map((workspace) => {
        const isActive = workspace.id === activeWorkspace;
        const tabIndex = workspace.id === activeWorkspace ? 0 : -1;
        const ariaLabel = formatAriaLabel(workspace);
        const title = ariaLabel;
        return (
          <button
            key={workspace.id}
            type="button"
            tabIndex={tabIndex}
            aria-pressed={isActive}
            aria-label={ariaLabel}
            title={title}
            onClick={() => onSelect(workspace.id)}
            className={`group relative flex h-7 w-7 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
              isActive ? "bg-white/20" : "bg-transparent hover:bg-white/10"
            }`}
          >
            <span className="sr-only">{ariaLabel}</span>
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full transition-transform ${
                isActive
                  ? "scale-110 bg-[var(--kali-blue)] shadow-[0_0_0_2px_rgba(23,147,209,0.35)]"
                  : "bg-white/70 group-hover:bg-white"
              }`}
            />
            {workspace.openWindows > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/10 px-1 text-[10px] text-white/80">
                {workspace.openWindows}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

