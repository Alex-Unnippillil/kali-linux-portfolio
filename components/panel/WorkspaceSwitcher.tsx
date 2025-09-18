'use client';

import React from 'react';
import { useWorkspaceManager } from './workspace-context';

const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, activeWorkspace, switchWorkspace, workspaceStates } = useWorkspaceManager();

  return (
    <nav
      aria-label="Workspace switcher"
      className="flex h-full items-center gap-1"
    >
      {workspaces.map((workspace, index) => {
        const isActive = workspace.id === activeWorkspace;
        const snapshot = workspaceStates[workspace.id];
        const openCount = Object.values(snapshot?.closed_windows ?? {}).filter((value) => value === false).length;
        const label = `Workspace ${index + 1}${openCount ? ` (${openCount} window${openCount === 1 ? '' : 's'})` : ''}`;

        return (
          <button
            key={workspace.id}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => switchWorkspace(workspace.id)}
            className={`relative flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${isActive ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            {workspace.label}
            {openCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default WorkspaceSwitcher;
