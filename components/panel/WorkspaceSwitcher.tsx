"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

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
  const containerRef = useRef<HTMLElement>(null);
  const rovingIndexRef = useRef(0);

  useEffect(() => {
    if (workspaces.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[data-workspace-button="true"]'
      )
    );
    if (buttons.length === 0) return;

    const activeIndex = Math.max(
      0,
      workspaces.findIndex((workspace) => workspace.id === activeWorkspace)
    );
    rovingIndexRef.current = activeIndex;
    buttons.forEach((button, index) => {
      button.tabIndex = index === activeIndex ? 0 : -1;
    });
  }, [workspaces, activeWorkspace]);

  const focusWorkspaceAt = (index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[data-workspace-button="true"]'
      )
    );
    if (buttons.length === 0) return;

    const normalizedIndex = ((index % buttons.length) + buttons.length) % buttons.length;
    rovingIndexRef.current = normalizedIndex;

    buttons.forEach((button, buttonIndex) => {
      button.tabIndex = buttonIndex === normalizedIndex ? 0 : -1;
    });

    buttons[normalizedIndex]?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (workspaces.length === 0) return;

    const { key } = event;
    const forwardKeys = ["ArrowRight", "ArrowDown"];
    const backwardKeys = ["ArrowLeft", "ArrowUp"];

    if (forwardKeys.includes(key)) {
      event.preventDefault();
      focusWorkspaceAt(rovingIndexRef.current + 1);
    } else if (backwardKeys.includes(key)) {
      event.preventDefault();
      focusWorkspaceAt(rovingIndexRef.current - 1);
    }
  };

  if (workspaces.length === 0) return null;

  return (
    <nav
      aria-label="Workspace switcher"
      aria-orientation="horizontal"
      role="tablist"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="flex items-center overflow-hidden rounded-md border border-white/10 bg-[#1e2430]"
    >
      {workspaces.map((workspace, index) => {
        const isActive = workspace.id === activeWorkspace;
        const tabIndex = workspace.id === activeWorkspace ? 0 : -1;
        return (
          <button
            key={workspace.id}
            type="button"
            tabIndex={tabIndex}
            aria-selected={isActive}
            role="tab"
            aria-label={formatAriaLabel(workspace)}
            onClick={() => onSelect(workspace.id)}
            data-workspace-button="true"
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

