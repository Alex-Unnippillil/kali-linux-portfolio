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
  const buttonsRef = React.useRef<Array<HTMLButtonElement | null>>([]);

  const focusWorkspaceByIndex = React.useCallback(
    (nextIndex: number) => {
      const normalizedIndex =
        (nextIndex + workspaces.length) % workspaces.length;
      const nextWorkspace = workspaces[normalizedIndex];
      const button = buttonsRef.current[normalizedIndex];

      button?.focus();
      if (nextWorkspace) {
        onSelect(nextWorkspace.id);
      }
    },
    [onSelect, workspaces]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          focusWorkspaceByIndex(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          focusWorkspaceByIndex(index - 1);
          break;
        case "Home":
          event.preventDefault();
          focusWorkspaceByIndex(0);
          break;
        case "End":
          event.preventDefault();
          focusWorkspaceByIndex(workspaces.length - 1);
          break;
        default:
          break;
      }
    },
    [focusWorkspaceByIndex, workspaces.length]
  );

  if (workspaces.length === 0) return null;

  return (
    <nav
      aria-label="Workspace switcher"
      className="flex items-center overflow-hidden rounded-md border border-white/10 bg-[#1e2430]"
    >
      {workspaces.map((workspace, index) => {
        const isActive = workspace.id === activeWorkspace;
        return (
          <button
            key={workspace.id}
            type="button"
            aria-pressed={isActive}
            aria-label={formatAriaLabel(workspace)}
            onClick={() => onSelect(workspace.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
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

