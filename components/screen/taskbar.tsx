import React from 'react';

interface App {
  id: string;
  title: string;
  icon?: string;
}

interface Props {
  apps: App[];
  closed_windows: Record<string, boolean>;
  minimized_windows: Record<string, boolean>;
  focused_windows: Record<string, boolean>;
  openApp: (id: string) => void;
  minimize: (id: string) => void;
}

const Taskbar: React.FC<Props> = ({ apps, closed_windows, minimized_windows, focused_windows, openApp, minimize }) => {
  return (
    <div>
      {apps.filter((a) => !closed_windows[a.id]).map((app) => {
        const isFocused = focused_windows[app.id];
        const isMin = minimized_windows[app.id];
        const handleClick = () => {
          if (isFocused) {
            minimize(app.id);
          } else if (isMin) {
            openApp(app.id);
          } else {
            minimize(app.id);
          }
        };
        return (
          <button key={app.id} data-context="taskbar" onClick={handleClick} aria-label={app.title}>
            {app.title}
          </button>
        );
      })}
    </div>
  );
};

export default Taskbar;
