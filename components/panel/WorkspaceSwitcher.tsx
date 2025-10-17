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
  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const keyboardSelectionRef = React.useRef(false);
  const [focusIndex, setFocusIndex] = React.useState(() => {
    const activeIndex = workspaces.findIndex(
      (workspace) => workspace.id === activeWorkspace,
    );
    return activeIndex >= 0 ? activeIndex : 0;
  });

  React.useEffect(() => {
    if (workspaces.length === 0) return;
    if (focusIndex >= workspaces.length) {
      setFocusIndex(workspaces.length - 1);
    }
  }, [focusIndex, workspaces.length]);

  const handleFocus = React.useCallback((index: number) => {
    setFocusIndex(index);
  }, []);

  const focusButtonAtIndex = React.useCallback(
    (index: number) => {
      if (workspaces.length === 0) return;
      const total = workspaces.length;
      const normalized = ((index % total) + total) % total;
      setFocusIndex(normalized);
      const focusButton = () => {
        buttonRefs.current[normalized]?.focus();
      };
      if (typeof window !== "undefined") {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(focusButton);
        } else {
          window.setTimeout(focusButton, 0);
        }
      } else {
        focusButton();
      }
    },
    [workspaces.length],
  );

  const handleKeyDown = React.useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      index: number,
      workspace: WorkspaceSummary,
    ) => {
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          focusButtonAtIndex(index + 1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          focusButtonAtIndex(index - 1);
          break;
        case "Home":
          event.preventDefault();
          focusButtonAtIndex(0);
          break;
        case "End":
          event.preventDefault();
          focusButtonAtIndex(workspaces.length - 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          keyboardSelectionRef.current = true;
          onSelect(workspace.id);
          break;
        default:
          break;
      }
    },
    [focusButtonAtIndex, onSelect, workspaces.length],
  );

  const handleClick = React.useCallback(
    (workspaceId: number) => {
      if (keyboardSelectionRef.current) {
        keyboardSelectionRef.current = false;
        return;
      }
      onSelect(workspaceId);
    },
    [onSelect],
  );

  const activeWorkspaceAnnouncement = React.useMemo(() => {
    const active = workspaces.find(
      (workspace) => workspace.id === activeWorkspace,
    );
    return active ? `Active workspace: ${formatAriaLabel(active)}` : "";
  }, [activeWorkspace, workspaces]);

  if (workspaces.length === 0) return null;

  return (
    <nav
      aria-label="Workspace switcher"
      className="flex items-center overflow-hidden rounded-md border border-white/10 bg-[#1e2430]"
    >
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {activeWorkspaceAnnouncement}
      </span>
      {workspaces.map((workspace, index) => {
        const isActive = workspace.id === activeWorkspace;
        const tabIndex = index === focusIndex ? 0 : -1;
        return (
          <button
            key={workspace.id}
            type="button"
            tabIndex={tabIndex}
            aria-pressed={isActive}
            aria-current={isActive ? "true" : undefined}
            aria-label={formatAriaLabel(workspace)}
            onClick={() => handleClick(workspace.id)}
            onFocus={() => handleFocus(index)}
            onKeyDown={(event) => handleKeyDown(event, index, workspace)}
            ref={(element) => {
              buttonRefs.current[index] = element;
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

