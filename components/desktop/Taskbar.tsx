import React, { useCallback, useMemo } from 'react';
import Image from 'next/image';

interface DesktopAppMeta {
  id: string;
  title: string;
  icon: string;
  [key: string]: unknown;
}

type WindowStateMap = Record<string, boolean | undefined>;

type OpenApp = (id: string) => void;

type MinimizeApp = (id: string) => void;

interface TaskbarProps {
  apps: DesktopAppMeta[];
  closed_windows: WindowStateMap;
  minimized_windows: WindowStateMap;
  focused_windows: WindowStateMap;
  openApp: OpenApp;
  minimize: MinimizeApp;
}

const TaskbarComponent: React.FC<TaskbarProps> = ({
  apps,
  closed_windows,
  minimized_windows,
  focused_windows,
  openApp,
  minimize,
}) => {
  const runningApps = useMemo(
    () => apps.filter((app) => closed_windows[app.id] === false),
    [apps, closed_windows],
  );

  const handleClick = useCallback(
    (appId: string) => {
      if (minimized_windows[appId]) {
        openApp(appId);
      } else if (focused_windows[appId]) {
        minimize(appId);
      } else {
        openApp(appId);
      }
    },
    [focused_windows, minimize, minimized_windows, openApp],
  );

  return (
    <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
      {runningApps.map((app) => {
        const isFocused = Boolean(focused_windows[app.id] && !minimized_windows[app.id]);
        const isMinimized = Boolean(minimized_windows[app.id]);

        return (
          <button
            key={app.id}
            type="button"
            aria-label={app.title}
            data-context="taskbar"
            data-app-id={app.id}
            onClick={() => handleClick(app.id)}
            className={`${isFocused ? ' bg-white bg-opacity-20 ' : ' '}relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10`}
          >
            <Image
              width={24}
              height={24}
              className="w-5 h-5"
              src={app.icon.replace('./', '/')}
              alt=""
              sizes="24px"
            />
            <span className="ml-1 text-sm text-white whitespace-nowrap">{app.title}</span>
            {!isFocused && !isMinimized && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
            )}
          </button>
        );
      })}
    </div>
  );
};

const Taskbar = React.memo(TaskbarComponent);

Taskbar.displayName = 'Taskbar';

export default Taskbar;
