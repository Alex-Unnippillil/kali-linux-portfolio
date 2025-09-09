import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import usePersistentState from '../../../hooks/usePersistentState';

const BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

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
  const [rowSize] = usePersistentState<number>('xfce.panel.size', 24);
  const panelRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const el = panelRef.current;
      if (el) {
        setOverflow(el.scrollWidth > el.clientWidth);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [apps]);

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
    <div
      ref={panelRef}
      className="flex overflow-hidden"
      style={{ height: rowSize }}
    >
      {apps.map((app) => (
        <div
          key={app.id}
          data-app-id={app.id}
          onDragEnter={handleDragOver(app.id)}
          onDragOver={handleDragOver(app.id)}
          onDragLeave={handleDragLeave(app.id)}
          onDrop={handleDrop(app.id)}
          className={`transition-outline flex items-center justify-center ${
            dragTarget === app.id ? 'outline outline-2 outline-blue-500' : ''
          }`}
          style={{ width: rowSize, height: rowSize }}
        >
          {app.icon ? (
            <Image
              src={app.icon}
              alt={app.title}
              className="max-w-full max-h-full"
              width={rowSize}
              height={rowSize}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          ) : (
            <span>{app.title}</span>
          )}
        </div>
      ))}
      {overflow && (
        <div
          className="flex items-center justify-center"
          style={{ width: rowSize, height: rowSize }}
          aria-hidden="true"
        >
          ⌄
        </div>
      )}
    </div>
  );
};

export default TaskList;
