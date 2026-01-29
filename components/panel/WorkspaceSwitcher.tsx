"use client";

import React, { useState, useRef, useEffect } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (workspaces.length === 0) return null;

  return (
    <>
      {/* Desktop: Horizontal number pills (hidden on mobile) */}
      <nav
        aria-label="Workspace switcher"
        className="hidden items-center gap-1 overflow-hidden rounded-full border border-white/10 bg-slate-950/65 px-1.5 py-1 shadow-[0_16px_36px_-28px_rgba(2,6,23,0.95)] backdrop-blur-md sm:flex"
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
              className={`group relative flex h-8 min-w-[2.25rem] items-center justify-center rounded-full px-3 text-xs font-semibold tracking-wide transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${isActive
                  ? "bg-cyan-500/20 text-white shadow-[0_0_0_1px_rgba(148,210,255,0.35)]"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
            >
              <span>{index + 1}</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-[var(--kali-blue)] transition-all duration-150 ${isActive ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0"
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

      {/* Mobile: Dropdown (visible only on mobile) */}
      <div className="relative sm:hidden" ref={containerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Workspace Switcher"
          className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-xs font-bold text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${isOpen ? "bg-white/15 ring-2 ring-cyan-500/50" : ""
            }`}
        >
          {activeWorkspace + 1}
        </button>

        {isOpen && (
          <div className="absolute left-0 z-50 mt-2 w-48 origin-top-left animate-in fade-in zoom-in-95 duration-200">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f192a]/95 p-2 shadow-2xl backdrop-blur-2xl">
              <div className="grid grid-cols-2 gap-1">
                {workspaces.map((workspace) => {
                  const isActive = workspace.id === activeWorkspace;
                  return (
                    <button
                      key={workspace.id}
                      onClick={() => {
                        onSelect(workspace.id);
                        setIsOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center rounded-lg p-3 text-center transition-all active:scale-95 ${isActive
                          ? "bg-cyan-500/20 text-white"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      <span className="text-lg font-bold">{workspace.id + 1}</span>
                      {workspace.openWindows > 0 && (
                        <span className="text-[10px] opacity-60">
                          {workspace.openWindows}w
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
