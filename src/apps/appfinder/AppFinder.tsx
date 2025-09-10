import { isBrowser } from '@/utils/env';
import React, { useEffect, useState } from 'react';
import logger from '../../../utils/logger';

// Representation of a parsed .desktop entry
export interface DesktopEntry {
  name: string;
  exec: string;
  icon?: string;
}

const HISTORY_KEY = 'appfinder-history';
const FILE_MANAGER_KEY = 'appfinder-file-manager';
const HISTORY_LIMIT = 20;

// Attempt to parse .desktop files from common application directories.
async function loadApplications(): Promise<DesktopEntry[]> {
  // When executed in a browser environment there is no access to the
  // file system. In that case just return an empty list.
  if (isBrowser()) return [];

  const fg = (await import('fast-glob')).default as typeof import('fast-glob');
  const fs = await import('fs/promises');

  const dirs: string[] = [
    '/usr/share/applications',
    '/usr/local/share/applications',
  ];
  if (process.env.HOME) {
    dirs.push(`${process.env.HOME}/.local/share/applications`);
  }

  const apps: DesktopEntry[] = [];

  for (const dir of dirs) {
    try {
      const files = await fg('*.desktop', { cwd: dir, absolute: true });
      for (const file of files) {
        try {
          const text = await fs.readFile(file, 'utf8');
          const entry = parseDesktopFile(text);
          if (entry) apps.push(entry);
        } catch {
          // Ignore malformed files
        }
      }
    } catch {
      // Directory may not exist; ignore
    }
  }
  return apps;
}

// Basic .desktop file parser. Only a very small subset of the specification is
// implemented – enough to obtain the name, command and icon.
function parseDesktopFile(contents: string): DesktopEntry | null {
  let inEntry = false;
  const data: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) {
      inEntry = line.trim() === '[Desktop Entry]';
      continue;
    }
    if (!inEntry) continue;
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m && m[1] && m[2]) {
      const key = m[1];
      const value = m[2];
      data[key.trim()] = value.trim();
    } else {
      // Skip lines without a valid key/value pair
      continue;
    }
  }
  if (!data.Name || !data.Exec) return null;
  const entry: DesktopEntry = { name: data.Name, exec: data.Exec };
  if (data.Icon) entry.icon = data.Icon;
  return entry;
}

// Resolve a command to open a directory using the user's preferred file
// manager. The preferred manager is stored in localStorage under
// FILE_MANAGER_KEY. Fallback is `xdg-open` which works on most systems.
function buildFileManagerCommand(path: string): string {
  let manager = 'xdg-open';
  if (isBrowser()) {
    manager = localStorage.getItem(FILE_MANAGER_KEY) || manager;
  }
  return `${manager} "${path}"`;
}

export default function AppFinder() {
  const [expanded, setExpanded] = useState(false);
  const [apps, setApps] = useState<DesktopEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  // Load applications and history on first render
  useEffect(() => {
    loadApplications().then(setApps);
    if (isBrowser()) {
      try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) setHistory(JSON.parse(stored));
      } catch {
        /* noop */
      }
    }
  }, []);

  // Persist history whenever it changes
  useEffect(() => {
    if (isBrowser()) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch {
        /* noop */
      }
    }
  }, [history]);

  const launch = (command: string) => {
    // Browser environments cannot execute programs. We expose the intended
    // command using a custom URL scheme so integrations can handle it if
    // desired. Fallback is simply logging to the console.
    if (isBrowser()) {
      try {
        window.open(`command:${command}`);
      } catch {
        logger.info('Execute:', command);
      }
    }
  };

  const pushHistory = (entry: string) => {
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h !== entry)].slice(
        0,
        HISTORY_LIMIT,
      );
      return next;
    });
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;

    if (value.startsWith('/')) {
      const cmd = buildFileManagerCommand(value);
      launch(cmd);
      pushHistory(value);
    } else {
      const entry = apps.find(
        (a) => a.name.toLowerCase() === value.toLowerCase(),
      );
      if (entry) {
        launch(entry.exec);
        pushHistory(entry.name);
      }
    }

    setQuery('');
  };

  return (
    <div className="appfinder">
      <button
        className="toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? 'Close' : 'App Finder'}
      </button>

      {expanded && (
        <div className="finder-panel">
          <form onSubmit={handleSubmit} className="search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or enter command"
              autoFocus
            />
          </form>

          {apps.length > 0 && (
            <ul className="apps">
              {apps.map((app) => (
                <li key={app.name}>
                  <button
                    onClick={() => {
                      launch(app.exec);
                      pushHistory(app.name);
                    }}
                  >
                    {app.icon && (
                      <img src={app.icon} alt="" className="icon" />
                    )}
                    {app.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {history.length > 0 && (
            <div className="history">
              <h4>History</h4>
              <ul>
                {history.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

