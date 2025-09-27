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

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSelect,
}: WorkspaceSwitcherProps) {
  if (workspaces.length === 0) return null;

  return (
    <nav
      aria-label="Workspace switcher"
      className="flex items-center gap-space-1 rounded-pill bg-black/50 px-space-1 py-space-0-5"
    >
      {workspaces.map((workspace, index) => {
        const isActive = workspace.id === activeWorkspace;
        const tabIndex = workspace.id === activeWorkspace ? 0 : -1;
        return (
          <button
            key={workspace.id}
            type="button"
            tabIndex={tabIndex}
            aria-pressed={isActive}
            aria-label={formatAriaLabel(workspace)}
            onClick={() => onSelect(workspace.id)}
            className={`min-w-[28px] rounded-pill px-space-2 py-space-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-accent focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
              isActive
                ? "bg-kali-primary text-kali-inverse"
                : "bg-transparent text-kali-text/80 hover:bg-white/10"
            }`}
          >
            <span>{index + 1}</span>
            {workspace.openWindows > 0 && !isActive && (
              <span className="ml-space-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-pill bg-white/10 px-space-1 text-[10px] text-kali-text/80">
                {workspace.openWindows}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

