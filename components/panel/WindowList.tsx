import React from 'react';

interface WindowListProps {
  apps: { id: string; title: string }[];
  closed_windows: Record<string, boolean>;
  minimized_windows: Record<string, boolean>;
  focused_windows: Record<string, boolean>;
  openApp: (id: string) => void;
  closeApp: (id: string) => void;
}

export default function WindowList({
  apps,
  closed_windows,
  minimized_windows,
  focused_windows,
  openApp,
  closeApp,
}: WindowListProps) {
  const windows = apps.filter((app) => closed_windows[app.id] === false);

  const handleMouseDown = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    if (e.button === 1) {
      e.preventDefault();
      closeApp(id);
    }
  };

  if (windows.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-10 left-0 w-full flex justify-center z-40">
      <ul className="flex gap-2 bg-black bg-opacity-50 rounded px-2 py-1">
        {windows.map((app) => {
          const active =
            focused_windows[app.id] && !minimized_windows[app.id];
          return (
            <li key={app.id}>
              <button
                type="button"
                onClick={() => openApp(app.id)}
                onMouseDown={(e) => handleMouseDown(e, app.id)}
                className={`max-w-[8rem] px-2 py-1 text-sm truncate rounded focus:outline-none ${
                  active
                    ? 'bg-ub-orange text-black'
                    : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
              >
                {app.title}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

