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
      className="flex items-center gap-1 overflow-hidden rounded-full border border-white/10 bg-slate-950/65 px-1.5 py-1 shadow-[0_16px_36px_-28px_rgba(2,6,23,0.95)] backdrop-blur-md"
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
    </nav>
  );
}

