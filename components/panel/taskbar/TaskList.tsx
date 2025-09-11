import React, { useState, useCallback } from 'react';

interface AppDefinition {
  id: string;
  title: string;
  icon?: string;
}

interface TaskListProps {
  apps: AppDefinition[];
  /**
   * Called when a window is dropped onto an app icon. The first argument is
   * the window id, the second is the target app id.
   */
  onMinimizeWindow: (windowId: string, appId: string) => void;
}

const WINDOW_MIME = 'application/x-window-id';

const TaskList: React.FC<TaskListProps> = ({ apps, onMinimizeWindow }) => {
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  const handleDragOver = useCallback(
    (appId: string) => (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(WINDOW_MIME)) {
        e.preventDefault();
        setDragTarget(appId);
      }
    },
    [],
  );

  const handleDragLeave = useCallback(
    (appId: string) => () => {
      setDragTarget((prev) => (prev === appId ? null : prev));
    },
    [],
  );

  const handleDrop = useCallback(
    (appId: string) => (e: React.DragEvent) => {
      const winId = e.dataTransfer.getData(WINDOW_MIME);
      if (winId) {
        onMinimizeWindow(winId, appId);
      }
      setDragTarget(null);
      e.preventDefault();
    },
    [onMinimizeWindow],
  );

  return (
    <div className="flex">
      {apps.map((app) => (
        <div
          key={app.id}
          data-app-id={app.id}
          onDragEnter={handleDragOver(app.id)}
          onDragOver={handleDragOver(app.id)}
          onDragLeave={handleDragLeave(app.id)}
          onDrop={handleDrop(app.id)}
          className={`p-1 transition-outline ${
            dragTarget === app.id ? 'outline outline-2 outline-blue-500' : ''
          }`}
        >
          {app.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.icon} alt="" className="w-5 h-5" />
          ) : (
            <span>{app.title}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default TaskList;
