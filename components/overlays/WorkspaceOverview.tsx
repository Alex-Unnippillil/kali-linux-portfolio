import React, { useEffect, useState } from 'react';

interface WorkspaceWindow {
  id: string;
  title: string;
  minimized?: boolean;
  closed?: boolean;
}

export interface Workspace {
  id: string;
  windows: WorkspaceWindow[];
}

interface WorkspaceOverviewProps {
  workspaces: Workspace[];
  /** index of the currently active workspace */
  current: number;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const WorkspaceOverview: React.FC<WorkspaceOverviewProps> = ({
  workspaces,
  current,
  onSelect,
  onClose,
}) => {
  const [focused, setFocused] = useState(current);

  // Determine grid size (square as possible)
  const cols = Math.ceil(Math.sqrt(workspaces.length));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const ws = workspaces[focused];
        if (ws) {
          onSelect(ws.id);
          onClose();
        }
        return;
      }
      const rows = Math.ceil(workspaces.length / cols);
      let row = Math.floor(focused / cols);
      let col = focused % cols;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          col = (col - 1 + cols) % cols;
          break;
        case 'ArrowRight':
          e.preventDefault();
          col = (col + 1) % cols;
          break;
        case 'ArrowUp':
          e.preventDefault();
          row = (row - 1 + rows) % rows;
          break;
        case 'ArrowDown':
          e.preventDefault();
          row = (row + 1) % rows;
          break;
        default:
          return;
      }
      let index = row * cols + col;
      if (index >= workspaces.length) {
        index = workspaces.length - 1;
      }
      setFocused(index);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focused, cols, workspaces, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 text-white">
      <div
        className="grid gap-4 p-4 w-full h-full max-h-screen max-w-screen box-border"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {workspaces.map((ws, i) => (
          <div
            key={ws.id}
            className={`relative border-2 rounded overflow-hidden ${
              i === focused ? 'border-ub-orange' : 'border-transparent'
            }`}
          >
            <div className="absolute top-1 left-2 text-xs">{`Workspace ${i + 1}`}</div>
            <div className="w-full h-full scale-75 origin-top-left pointer-events-none">
              <div className="grid gap-1 p-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
                {ws.windows
                  .filter((w) => !w.minimized && !w.closed)
                  .map((w) => (
                    <div
                      key={w.id}
                      className="bg-white bg-opacity-10 text-xs truncate p-1"
                    >
                      {w.title}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceOverview;

