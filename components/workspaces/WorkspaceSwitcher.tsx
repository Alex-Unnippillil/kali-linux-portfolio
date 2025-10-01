'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSyncExternalStore } from 'react';
import {
  getOrderedProjects,
  getServerSnapshot,
  getSnapshot,
  selectProject,
  subscribe,
  togglePin,
  WorkspaceListItem,
} from '../../utils/workspaces/store';

const INPUT_PLACEHOLDER = 'Search projects…';

const isTypingElement = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable
  );
};

const WorkspaceSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const storeState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const projects = useMemo<WorkspaceListItem[]>(
    () => getOrderedProjects(query),
    [query, storeState]
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlight(0);
  }, []);

  const handleSelect = useCallback(
    (project: WorkspaceListItem) => {
      selectProject(project.id);
      close();
    },
    [close]
  );

  useEffect(() => {
    if (!open) return;
    const focusInput = () => {
      const node = inputRef.current;
      if (!node) return;
      node.focus({ preventScroll: true });
      node.select();
    };
    const raf = requestAnimationFrame(focusInput);
    const timer = setTimeout(focusInput, 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === 'p') {
          if (isTypingElement(event.target)) return;
          event.preventDefault();
          setOpen(true);
          return;
        }
      }
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, close]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        close();
      }
    },
    [close]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!projects.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlight((value) => Math.min(value + 1, projects.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlight((value) => Math.max(value - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const project = projects[highlight];
        if (project) {
          handleSelect(project);
        }
      }
    },
    [handleSelect, highlight, projects]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={handleBackgroundClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Workspace switcher"
        className="w-full max-w-xl rounded-xl bg-[#0f1729] shadow-2xl ring-1 ring-white/10"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/10 p-4">
          <label htmlFor="workspace-switcher-query" className="sr-only">
            Search projects
          </label>
          <input
            id="workspace-switcher-query"
            ref={inputRef}
            autoComplete="off"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={INPUT_PLACEHOLDER}
            aria-controls="workspace-switcher-list"
            className="w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:border-[var(--kali-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
          />
          <p className="mt-2 text-xs text-white/60">
            Use ↑ ↓ to navigate, Enter to open, and ⌘/Ctrl+P to toggle this switcher.
          </p>
        </div>
        <ul
          id="workspace-switcher-list"
          ref={listRef}
          role="listbox"
          aria-label="Workspace projects"
          className="max-h-80 overflow-y-auto p-2"
        >
          {projects.length === 0 ? (
            <li className="px-3 py-4 text-sm text-white/60">No projects match that query.</li>
          ) : (
            projects.map((project, index) => {
              const isActive = index === highlight;
              return (
                <li
                  key={project.id}
                  role="option"
                  aria-selected={isActive}
                  data-index={index}
                  id={`workspace-option-${project.id}`}
                  className={`group mb-1 last:mb-0 rounded-lg ${
                    isActive ? 'bg-white/15' : 'hover:bg-white/10'
                  }`}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => handleSelect(project)}
                >
                  <div className="flex items-start gap-3 px-3 py-2 text-left text-sm text-white">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {project.title}
                        </span>
                        {project.pinned && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/70 line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
                        <span className="rounded-full bg-white/10 px-2 py-0.5">
                          Last tab: {project.lastTab}
                        </span>
                        {project.stack.slice(0, 2).map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-white/10 px-2 py-0.5"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={project.pinned ? 'Unpin project' : 'Pin project'}
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePin(project.id);
                      }}
                      className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                        project.pinned
                          ? 'border-[var(--kali-blue)] text-[var(--kali-blue)]'
                          : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white'
                      }`}
                    >
                      {project.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex justify-between border-t border-white/10 px-4 py-3 text-xs text-white/60">
          <span>{projects.length} project{projects.length === 1 ? '' : 's'} shown</span>
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-white/20 px-2 py-1 text-white/70 hover:border-white/40 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSwitcher;
