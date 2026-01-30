"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

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

// Icons for workspace types
const WorkspaceIcon = ({ windows }: { windows: number }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    className={`transition-all ${windows > 0 ? 'opacity-100' : 'opacity-40'}`}
  >
    <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
    {windows > 0 && <rect x="4" y="6" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.6" />}
    {windows > 1 && <rect x="9" y="6" width="3" height="4" rx="0.5" fill="currentColor" opacity="0.4" />}
  </svg>
);

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSelect,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation for desktop pills
  const handleDesktopKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % workspaces.length;
        onSelect(workspaces[nextIndex].id);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + workspaces.length) % workspaces.length;
        onSelect(workspaces[prevIndex].id);
      } else if (event.key === "Home") {
        event.preventDefault();
        onSelect(workspaces[0].id);
      } else if (event.key === "End") {
        event.preventDefault();
        onSelect(workspaces[workspaces.length - 1].id);
      }
    },
    [workspaces, onSelect]
  );

  // Keyboard navigation for mobile dropdown
  const handleDropdownKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, workspaces.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter" && focusedIndex >= 0) {
        event.preventDefault();
        onSelect(workspaces[focusedIndex].id);
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    },
    [isOpen, focusedIndex, workspaces, onSelect]
  );

  // Focus management for dropdown
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && dropdownRef.current) {
      const buttons = dropdownRef.current.querySelectorAll('button');
      buttons[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  if (workspaces.length === 0) return null;

  return (
    <>
      {/* Desktop: Horizontal number pills with enhanced visuals */}
      <nav
        aria-label="Workspace switcher"
        role="tablist"
        className="hidden items-center gap-0.5 overflow-hidden rounded-lg border border-white/10 bg-slate-950/70 px-1 py-0.5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:flex"
      >
        {workspaces.map((workspace, index) => {
          const isActive = workspace.id === activeWorkspace;
          return (
            <button
              key={workspace.id}
              type="button"
              role="tab"
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              aria-label={formatAriaLabel(workspace)}
              onClick={() => onSelect(workspace.id)}
              onKeyDown={(e) => handleDesktopKeyDown(e, index)}
              className={`group relative flex h-7 min-w-[2rem] items-center justify-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${isActive
                  ? "bg-gradient-to-b from-cyan-500/25 to-cyan-600/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)]"
                  : "text-white/60 hover:bg-white/[0.08] hover:text-white/90"
                }`}
            >
              <span className="relative z-10">{index + 1}</span>

              {/* Active indicator bar */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-1 bottom-0.5 h-[2px] rounded-full bg-cyan-400 transition-all duration-200 ${isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
                  }`}
              />

              {/* Window count badge */}
              {workspace.openWindows > 0 && (
                <span
                  className={`relative z-10 flex h-4 min-w-[1rem] items-center justify-center rounded px-1 text-[9px] font-bold transition-all ${isActive
                      ? "bg-cyan-400/20 text-cyan-300"
                      : "bg-white/10 text-white/50 group-hover:bg-white/15 group-hover:text-white/70"
                    }`}
                >
                  {workspace.openWindows}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile: Enhanced dropdown */}
      <div
        className="relative sm:hidden"
        ref={containerRef}
        onKeyDown={handleDropdownKeyDown}
      >
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setFocusedIndex(isOpen ? -1 : activeWorkspace);
          }}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`Workspace ${activeWorkspace + 1}, ${workspaces[activeWorkspace]?.openWindows || 0} windows`}
          className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold text-white shadow-md backdrop-blur-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${isOpen
              ? "border-cyan-500/50 bg-cyan-500/20 ring-2 ring-cyan-500/30"
              : "border-white/15 bg-slate-950/70 hover:border-white/25 hover:bg-white/10"
            }`}
        >
          <span className="relative">
            {activeWorkspace + 1}
            {(workspaces[activeWorkspace]?.openWindows || 0) > 0 && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
            )}
          </span>
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            role="listbox"
            aria-label="Select workspace"
            className="absolute left-0 z-50 mt-2 w-52 origin-top-left animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
          >
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
              <div className="p-1.5 space-y-0.5">
                {workspaces.map((workspace, index) => {
                  const isActive = workspace.id === activeWorkspace;
                  const isFocused = focusedIndex === index;
                  return (
                    <button
                      key={workspace.id}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onSelect(workspace.id);
                        setIsOpen(false);
                        setFocusedIndex(-1);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-150 focus:outline-none ${isActive
                          ? "bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-transparent text-white"
                          : isFocused
                            ? "bg-white/10 text-white"
                            : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${isActive
                              ? "bg-cyan-500/30 text-cyan-300"
                              : "bg-white/5 text-white/60"
                            }`}
                        >
                          {workspace.id + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{workspace.label}</span>
                          <span className="text-[10px] text-white/40">
                            {workspace.openWindows === 0
                              ? "Empty"
                              : workspace.openWindows === 1
                                ? "1 window"
                                : `${workspace.openWindows} windows`}
                          </span>
                        </div>
                      </div>

                      <WorkspaceIcon windows={workspace.openWindows} />

                      {isActive && (
                        <svg
                          className="h-4 w-4 text-cyan-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick tip */}
              <div className="border-t border-white/5 px-3 py-2 text-[10px] text-white/30">
                <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">↑↓</kbd> navigate
                <span className="mx-2">·</span>
                <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">Enter</kbd> select
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
