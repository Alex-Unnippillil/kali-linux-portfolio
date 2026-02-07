"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

export interface WorkspaceWindow {
  id: string;
  title: string;
  icon: string;
  isMinimized?: boolean;
  isFocused?: boolean;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface WorkspaceSummary {
  id: number;
  label: string;
  openWindows: number;
  windows?: WorkspaceWindow[];
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

const WorkspacePreview = ({ workspace, active }: { workspace: WorkspaceSummary; active?: boolean }) => {
  return (
    <div className={`relative w-full aspect-video rounded border overflow-hidden transition-all duration-200 ${active
      ? "bg-slate-800/80 border-cyan-500/50 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]"
      : "bg-slate-900/60 border-white/10 group-hover:border-white/20"
      }`}>
      {/* Background/Wallpaper hint */}
      <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />

      {/* Windows */}
      {(workspace.windows || []).map((win) => {
        // Robust scaling logic
        // Use defaults if w/h are missing or zero
        const safeW = (win.w && win.w > 0) ? win.w : 800;
        const safeH = (win.h && win.h > 0) ? win.h : 600;

        // Clamp percentages to avoid overflow or tiny windows
        // We assume 1920x1080 as a "canonical" desktop size for preview purposes
        const left = Math.max(0, Math.min(95, ((win.x || 0) / 19.2)));
        const top = Math.max(0, Math.min(95, ((win.y || 0) / 10.8)));
        const width = Math.max(15, Math.min(100, (safeW / 19.2)));
        const height = Math.max(15, Math.min(100, (safeH / 10.8)));

        return (
          <div
            key={win.id}
            className={`absolute rounded-[2px] shadow-sm overflow-hidden border flex flex-col ${win.isFocused
              ? "bg-slate-200 border-slate-400 z-10 shadow-md"
              : "bg-slate-700 border-slate-600/50 z-0 opacity-90"
              }`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            {/* Window Header Line */}
            <div className={`h-[12%] min-h-[4px] w-full ${win.isFocused ? 'bg-slate-300' : 'bg-slate-800'}`} />

            {/* Content Area */}
            <div className={`flex-1 relative w-full ${win.isFocused ? 'bg-white' : 'bg-slate-800'}`}>
              {/* Icon */}
              {win.icon && (
                <div className="absolute inset-0 flex items-center justify-center opacity-50 p-0.5">
                  { }
                  <img
                    src={win.icon}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Label Badge */}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-medium text-white/50 backdrop-blur-sm">
        {workspace.openWindows} apps
      </div>
    </div>
  );
};

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSelect,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside handler
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
      {/* Desktop: Horizontal number pills with Hover Preview */}
      <nav
        aria-label="Workspace switcher"
        role="tablist"
        className="hidden items-center gap-0.5 overflow-visible rounded-lg border border-white/10 bg-slate-950/70 px-1 py-0.5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:flex relative"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {workspaces.map((workspace, index) => {
          const isActive = workspace.id === activeWorkspace;
          return (
            <div key={workspace.id} className="relative group">
              <button
                type="button"
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-label={formatAriaLabel(workspace)}
                onClick={() => onSelect(workspace.id)}
                onMouseEnter={() => setHoveredIndex(index)}
                className={`flex h-7 min-w-[2rem] items-center justify-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${isActive
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

              {/* Desktop Hover Preview Tooltip */}
              {hoveredIndex === index && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                  role="tooltip"
                >
                  <div className="p-1.5 rounded-lg border border-white/10 bg-slate-900/90 shadow-xl backdrop-blur-md">
                    <WorkspacePreview workspace={workspace} active={isActive} />
                    <div className="mt-1.5 px-1 text-center text-[10px] text-white/60 font-medium truncate">
                      {workspace.label}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Mobile: Enhanced dropdown with Grid Preview */}
      <div
        className="relative sm:hidden"
        ref={containerRef}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="grid"
          aria-label={`Workspace ${activeWorkspace + 1}`}
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
            role="dialog"
            aria-label="Select workspace"
            className="absolute left-0 z-50 mt-2 w-72 origin-top-left animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
          >
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-2xl p-3">
              <div className="grid grid-cols-2 gap-3">
                {workspaces.map((workspace) => {
                  const isActive = workspace.id === activeWorkspace;
                  return (
                    <button
                      key={workspace.id}
                      onClick={() => {
                        onSelect(workspace.id);
                        setIsOpen(false);
                      }}
                      className={`group flex flex-col gap-2 rounded-lg p-1.5 transition-all text-left focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${isActive
                        ? "bg-white/5 ring-1 ring-white/10"
                        : "hover:bg-white/5"
                        }`}
                    >
                      <WorkspacePreview workspace={workspace} active={isActive} />
                      <div className="flex items-center justify-between px-1 w-full">
                        <span className={`text-[11px] font-semibold ${isActive ? "text-cyan-300" : "text-white/70"}`}>
                          {workspace.label || indexToLabel(workspace.id)}
                        </span>
                        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 text-center text-[10px] text-white/30">
                Tap to switch workspaces
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function indexToLabel(index: number) {
  return `Desktop ${index + 1}`;
}
