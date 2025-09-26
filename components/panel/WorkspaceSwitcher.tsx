"use client";

import React, { useEffect, useState } from "react";

export interface WorkspaceSummary {
  id: number;
  label: string;
  openWindows: number;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceSummary[];
  activeWorkspace: number;
  previousWorkspace?: number | null;
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
  previousWorkspace = null,
  onSelect,
}: WorkspaceSwitcherProps) {
  const [transitionLabel, setTransitionLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (previousWorkspace === null || previousWorkspace === activeWorkspace) {
      setTransitionLabel(null);
      setVisible(false);
      return;
    }
    const label = `Workspace ${previousWorkspace + 1} → ${activeWorkspace + 1}`;
    setTransitionLabel(label);
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [previousWorkspace, activeWorkspace]);

  if (workspaces.length === 0) return null;

  return (
    <nav
      aria-label="Workspace switcher"
      className="flex items-center gap-1 rounded-full bg-black/50 px-1 py-0.5"
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
            data-active={isActive ? "true" : "false"}
            onClick={() => onSelect(workspace.id)}
            className={`min-w-[28px] rounded-full px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
              isActive
                ? "bg-[var(--kali-blue)] text-black"
                : "bg-transparent text-white/80 hover:bg-white/10"
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
      {transitionLabel && (
        <span
          aria-live="polite"
          className={`ml-2 rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/80 transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {transitionLabel}
        </span>
      )}
    </nav>
  );
}

