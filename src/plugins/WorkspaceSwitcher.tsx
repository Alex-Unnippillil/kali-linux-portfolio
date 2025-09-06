import { isBrowser } from '@/utils/env';
import React from 'react';

interface WorkspaceWindow {
  id: string;
  title: string;
  thumbnail: string; // URL to thumbnail image
}

interface Workspace {
  id: string;
  label: string;
  windows: WorkspaceWindow[];
}

interface WorkspaceSwitcherProps {
  /**
   * List of workspaces to render. Each workspace contains the windows that
   * belong to it and thumbnails for those windows.
   */
  workspaces: Workspace[];
  /**
   * Number of rows to arrange the workspace thumbnails into. Defaults to 1.
   */
  rows?: number;
  /**
   * Whether to render labels under each workspace. Defaults to true.
   */
  showLabels?: boolean;
  /**
   * When true the switcher only renders on the primary display. For simplicity
   * we consider the display with `screenX === 0` the primary display.
   */
  showOnlyOnPrimary?: boolean;
  /**
   * Called when a window is moved from one workspace to another via drag and
   * drop.
   */
  onMoveWindow?: (windowId: string, targetWorkspaceId: string) => void;
}

/**
 * WorkspaceSwitcher renders a grid of workspace thumbnails that supports
 * dragging windows between workspaces. Windows are represented by their
 * thumbnails which can be dragged onto another workspace to move them.
 */
const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  workspaces,
  rows = 1,
  showLabels = true,
  showOnlyOnPrimary = false,
  onMoveWindow,
}) => {
  if (showOnlyOnPrimary && isBrowser()) {
    if (window.screenX !== 0 && window.screenLeft !== 0) {
      return null;
    }
  }

  const handleDragStart = (windowId: string) => (ev: React.DragEvent) => {
    ev.dataTransfer.setData('application/x-window-id', windowId);
  };

  const handleDrop = (workspaceId: string) => (ev: React.DragEvent) => {
    ev.preventDefault();
    const winId = ev.dataTransfer.getData('application/x-window-id');
    if (winId && typeof onMoveWindow === 'function') {
      onMoveWindow(winId, workspaceId);
    }
  };

  const cols = Math.ceil(workspaces.length / rows);

  return (
    <div
      className="workspace-switcher grid gap-2"
      style={{
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
      }}
    >
      {workspaces.map((ws) => (
        <div
          key={ws.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop(ws.id)}
          className="workspace border border-gray-600 rounded p-1 flex flex-col"
        >
          <div className="flex flex-wrap gap-1 flex-1 items-start">
            {ws.windows.map((win) => (
              <img
                key={win.id}
                src={win.thumbnail}
                alt={win.title}
                draggable
                onDragStart={handleDragStart(win.id)}
                className="w-16 h-12 object-cover rounded"
              />
            ))}
          </div>
          {showLabels && (
            <div className="mt-1 text-center text-xs text-white opacity-80">
              {ws.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorkspaceSwitcher;
