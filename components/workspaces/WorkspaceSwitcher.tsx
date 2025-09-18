"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface WorkspaceProfile {
  id: string;
  name: string;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceProfile[];
  currentWorkspaceId?: string;
  onCreate?: () => void;
  onRename?: (id: string, name: string) => void;
  onDuplicate?: (id: string) => void;
  onSwitch?: (id: string) => void;
}

const noop = () => {};

const menuButtonBase =
  'w-full px-3 py-2 text-left text-sm hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  workspaces,
  currentWorkspaceId,
  onCreate = noop,
  onRename = noop,
  onDuplicate = noop,
  onSwitch = noop,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId),
    [currentWorkspaceId, workspaces],
  );

  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(currentWorkspace?.name ?? '');
    }
  }, [currentWorkspace?.name, isRenaming]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setIsRenaming(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
    }
  }, [isRenaming]);

  const toggleMenu = useCallback(() => {
    setIsOpen((value) => !value);
    setIsRenaming(false);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setIsRenaming(false);
  }, []);

  const handleCreateWorkspace = useCallback(() => {
    onCreate();
    closeMenu();
  }, [closeMenu, onCreate]);

  const handleRenameWorkspace = useCallback(
    (event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!currentWorkspace) return;
      const trimmedName = renameValue.trim();
      if (!trimmedName || trimmedName === currentWorkspace.name) {
        setIsRenaming(false);
        return;
      }
      onRename(currentWorkspace.id, trimmedName);
      closeMenu();
    },
    [closeMenu, currentWorkspace, onRename, renameValue],
  );

  const handleDuplicateWorkspace = useCallback(() => {
    if (!currentWorkspace) return;
    onDuplicate(currentWorkspace.id);
    closeMenu();
  }, [closeMenu, currentWorkspace, onDuplicate]);

  const handleSwitchWorkspace = useCallback(
    (id: string) => {
      onSwitch(id);
      closeMenu();
    },
    [closeMenu, onSwitch],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    },
    [closeMenu],
  );

  const menuId = 'workspace-switcher-menu';
  const buttonLabel = currentWorkspace?.name ?? 'Workspace';

  return (
    <div ref={containerRef} className="relative h-full flex items-center">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-white/10 hover:bg-white/20 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`Switch workspace (Current: ${buttonLabel})`}
        onClick={toggleMenu}
      >
        <span className="font-medium">{buttonLabel}</span>
        <span aria-hidden className="text-xs">▾</span>
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Workspace actions"
          className="absolute bottom-12 left-0 w-64 rounded-md bg-gray-900/95 text-white shadow-lg border border-white/10 backdrop-blur-sm focus:outline-none"
          onKeyDown={handleKeyDown}
        >
          <div className="border-b border-white/10 py-1">
            <button
              type="button"
              role="menuitem"
              className={`${menuButtonBase}`}
              onClick={handleCreateWorkspace}
            >
              New workspace
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${menuButtonBase} ${(currentWorkspace ? '' : 'opacity-50 cursor-not-allowed')}`}
              onClick={() => {
                if (!currentWorkspace) return;
                setIsRenaming((value) => !value);
              }}
              disabled={!currentWorkspace}
            >
              Rename workspace
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${menuButtonBase} ${(currentWorkspace ? '' : 'opacity-50 cursor-not-allowed')}`}
              onClick={handleDuplicateWorkspace}
              disabled={!currentWorkspace}
            >
              Duplicate workspace
            </button>
          </div>
          {isRenaming && currentWorkspace && (
            <div className="border-b border-white/10 px-3 py-2">
              <form onSubmit={handleRenameWorkspace} className="space-y-2">
                <label className="block text-xs uppercase tracking-wide text-white/60" htmlFor="workspace-rename-input">
                  Rename current workspace
                </label>
                <input
                  id="workspace-rename-input"
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="w-full rounded bg-black/40 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="Workspace name"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded bg-blue-600 px-2 py-1 text-sm font-medium hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded bg-white/10 px-2 py-1 text-sm hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    onClick={() => {
                      setIsRenaming(false);
                      setRenameValue(currentWorkspace.name);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="py-1">
            <p className="px-3 pb-1 text-xs uppercase tracking-wide text-white/60">Switch workspace</p>
            <div className="max-h-56 overflow-y-auto">
              {workspaces.length ? (
                workspaces.map((workspace) => {
                  const isActive = workspace.id === currentWorkspace?.id;
                  return (
                    <button
                      key={workspace.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      className={`${menuButtonBase} flex items-center justify-between ${
                        isActive ? 'bg-white/15' : ''
                      }`}
                      onClick={() => handleSwitchWorkspace(workspace.id)}
                    >
                      <span>{workspace.name}</span>
                      {isActive && <span aria-hidden className="text-xs">●</span>}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-2 text-sm text-white/60">No workspaces available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
