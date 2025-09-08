import React, { useState } from 'react';

interface AppItem {
  id: string;
  title: string;
  icon: string;
}

const APPS: AppItem[] = [
  { id: 'terminal', title: 'Terminal', icon: '💻' },
  { id: 'browser', title: 'Browser', icon: '🌐' },
  { id: 'files', title: 'Files', icon: '📁' },
];

/**
 * Simple vertical dock with launcher icons.
 * Clicking an icon toggles a running indicator.
 */
const Dock: React.FC = () => {
  const [running, setRunning] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setRunning((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav
      aria-label="Dock"
      className="fixed left-2 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-2"
    >
      {APPS.map((app) => {
        const isRunning = running[app.id];
        return (
          <button
            key={app.id}
            type="button"
            aria-label={app.title}
            onClick={() => toggle(app.id)}
            className="relative w-12 h-12 flex items-center justify-center rounded bg-black/20 text-xl text-white transition-colors hover:bg-white/20 active:bg-white/30"
          >
            <span>{app.icon}</span>
            {isRunning && (
              <span
                data-testid={`indicator-${app.id}`}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 rounded-full bg-white"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default Dock;
