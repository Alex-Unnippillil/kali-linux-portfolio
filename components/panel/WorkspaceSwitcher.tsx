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
      className="flex items-center gap-1 rounded-full border border-white/10 bg-ub-grey/80 px-1 py-0.5 shadow-[0_4px_18px_rgba(0,0,0,0.4)] backdrop-blur"
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
            className={`min-w-[28px] rounded-full px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange/70 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent ${
              isActive
                ? "bg-[var(--kali-blue)] text-black shadow-[0_0_12px_rgba(23,147,209,0.6)]"
                : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            <span>{index + 1}</span>
            {workspace.openWindows > 0 && !isActive && (
              <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/10 px-1 text-[10px] text-white/80">
                {workspace.openWindows}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

