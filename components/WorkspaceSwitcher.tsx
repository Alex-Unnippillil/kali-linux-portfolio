import React from 'react';
import { useSettings } from '../hooks/useSettings';
import { useWorkspaceStore } from '../hooks/useWorkspaceStore';

export default function WorkspaceSwitcher() {
  const { accent } = useSettings();
  const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore();

  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3].map((i) => {
        const isActive = activeWorkspace === i;
        return (
          <button
            key={i}
            aria-pressed={isActive}
            onClick={() => setActiveWorkspace(i)}
            className="w-8 h-8 flex items-center justify-center border-b-2"
            style={{ borderBottomColor: isActive ? accent : 'transparent' }}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
