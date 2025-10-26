"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import appsConfig from '@/apps.config.js';
import { safeLocalStorage } from '@/utils/safeStorage';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

type ManagedWindow = {
  id?: string;
  windowId?: string;
  key?: string;
  appId?: string;
  app?: { id?: string };
  app_id?: string;
  minimized?: boolean;
  isMinimized?: boolean;
  state?: string;
  focused?: boolean;
  isFocused?: boolean;
  active?: boolean;
  closed?: boolean;
  hidden?: boolean;
  visibility?: string;
};

type Subscription = (() => void) | { unsubscribe: () => void } | void;

type WindowManager = {
  getWindows?: () => ManagedWindow[];
  subscribe?: (listener: (windows: ManagedWindow[]) => void) => Subscription;
  open?: (appId: string) => void;
  openApp?: (appId: string) => void;
  launch?: (appId: string) => void;
  spawn?: (appId: string) => void;
  createWindow?: (appId: string) => void;
  focus?: (windowId: string) => void;
  focusWindow?: (windowId: string) => void;
  focusApp?: (appId: string) => void;
  activate?: (windowId: string) => void;
  bringToFront?: (windowId: string) => void;
  minimize?: (windowId: string, value?: boolean) => void;
  minimizeWindow?: (windowId: string) => void;
  toggleMinimize?: (windowId: string) => void;
  setMinimized?: (windowId: string, value: boolean) => void;
  restore?: (windowId: string) => void;
  restoreWindow?: (windowId: string) => void;
  updateWindow?: (windowId: string, patch: { minimized?: boolean }) => void;
};

type DockEntry = {
  app: AppMeta;
  isPinned: boolean;
  isRunning: boolean;
  isActive: boolean;
  hasVisibleWindow: boolean;
  windows: ManagedWindow[];
};

const PIN_STORAGE_KEY = 'desktop-dock-pins';
const appsList = (appsConfig as AppMeta[]).filter(
  (app) => app && typeof app.id === 'string' && !app.disabled,
);
const appIndex = new Map<string, AppMeta>();
appsList.forEach((app) => {
  appIndex.set(app.id, app);
});
const defaultPinned = Array.from(
  new Set(appsList.filter((app) => app.favourite).map((app) => app.id)),
);

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const getWindowManager = (): WindowManager | undefined => {
  if (typeof window !== 'undefined' && (window as any).wm) {
    return (window as any).wm as WindowManager;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).wm) {
    return (globalThis as any).wm as WindowManager;
  }
  return undefined;
};

const getWindowId = (win: ManagedWindow): string | undefined => {
  if (typeof win.id === 'string') return win.id;
  if (typeof win.windowId === 'string') return win.windowId;
  if (typeof win.key === 'string') return win.key;
  return undefined;
};

const getWindowAppId = (win: ManagedWindow): string | undefined => {
  if (typeof win.appId === 'string') return win.appId;
  if (typeof win.app_id === 'string') return win.app_id;
  const app = win.app;
  if (app && typeof app.id === 'string') return app.id;
  return undefined;
};

const isWindowClosed = (win: ManagedWindow): boolean => {
  if (win.closed === true) return true;
  const state = win.state;
  if (typeof state === 'string') {
    const normalized = state.toLowerCase();
    if (normalized === 'closed' || normalized === 'closing') return true;
  }
  return false;
};

const isWindowMinimized = (win: ManagedWindow): boolean => {
  if (typeof win.minimized === 'boolean') return win.minimized;
  if (typeof win.isMinimized === 'boolean') return win.isMinimized;
  const state = win.state;
  if (typeof state === 'string') {
    const normalized = state.toLowerCase();
    if (normalized === 'minimized' || normalized === 'hidden') return true;
  }
  if (win.hidden === true) return true;
  const visibility = win.visibility;
  if (typeof visibility === 'string') return visibility === 'hidden';
  return false;
};

const isWindowFocused = (win: ManagedWindow): boolean => {
  if (typeof win.focused === 'boolean') return win.focused;
  if (typeof win.isFocused === 'boolean') return win.isFocused;
  if (win.active === true) return true;
  const state = win.state;
  if (typeof state === 'string') {
    const normalized = state.toLowerCase();
    if (normalized === 'active' || normalized === 'focused') return true;
  }
  return false;
};

const normalizePins = (ids: unknown[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  ids.forEach((id) => {
    if (typeof id !== 'string') return;
    if (!appIndex.has(id)) return;
    if (seen.has(id)) return;
    seen.add(id);
    result.push(id);
  });
  return result;
};

const loadPinned = (): string[] => {
  if (!safeLocalStorage) return [...defaultPinned];
  try {
    const raw = safeLocalStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return [...defaultPinned];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return normalizePins(parsed);
    }
  } catch {
    // ignore corrupt data and fall back
  }
  return [...defaultPinned];
};

const savePinned = (pins: string[]) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(normalizePins(pins)));
  } catch {
    // ignore write errors (storage may be unavailable)
  }
};

const dispatchLegacyOpen = (appId: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('open-app', { detail: appId }));
};

const openApp = (manager: WindowManager | undefined, appId: string) => {
  const wm = manager ?? getWindowManager();
  if (!wm) {
    dispatchLegacyOpen(appId);
    return;
  }
  if (typeof wm.open === 'function') {
    wm.open(appId);
    return;
  }
  if (typeof wm.openApp === 'function') {
    wm.openApp(appId);
    return;
  }
  if (typeof wm.launch === 'function') {
    wm.launch(appId);
    return;
  }
  if (typeof wm.spawn === 'function') {
    (wm.spawn as (id: string) => void)(appId);
    return;
  }
  if (typeof wm.createWindow === 'function') {
    (wm.createWindow as (id: string) => void)(appId);
    return;
  }
  dispatchLegacyOpen(appId);
};

const focusWindow = (manager: WindowManager, win: ManagedWindow): boolean => {
  const id = getWindowId(win);
  const appId = getWindowAppId(win);
  if (id) {
    if (typeof manager.focus === 'function') {
      manager.focus(id);
      return true;
    }
    if (typeof manager.focusWindow === 'function') {
      manager.focusWindow(id);
      return true;
    }
    if (typeof manager.activate === 'function') {
      (manager.activate as (windowId: string) => void)(id);
      return true;
    }
    if (typeof manager.bringToFront === 'function') {
      (manager.bringToFront as (windowId: string) => void)(id);
      return true;
    }
  }
  if (appId && typeof manager.focusApp === 'function') {
    manager.focusApp(appId);
    return true;
  }
  return false;
};

const minimizeWindow = (manager: WindowManager, win: ManagedWindow): boolean => {
  const id = getWindowId(win);
  if (!id) return false;
  if (typeof manager.toggleMinimize === 'function') {
    manager.toggleMinimize(id);
    return true;
  }
  if (typeof manager.minimize === 'function') {
    manager.minimize(id);
    return true;
  }
  if (typeof manager.minimizeWindow === 'function') {
    manager.minimizeWindow(id);
    return true;
  }
  if (typeof manager.setMinimized === 'function') {
    manager.setMinimized(id, true);
    return true;
  }
  if (typeof manager.updateWindow === 'function') {
    manager.updateWindow(id, { minimized: true });
    return true;
  }
  return false;
};

const restoreWindow = (manager: WindowManager, win: ManagedWindow): boolean => {
  const id = getWindowId(win);
  if (!id) return false;
  if (isWindowMinimized(win)) {
    if (typeof manager.toggleMinimize === 'function') {
      manager.toggleMinimize(id);
    } else if (typeof manager.restore === 'function') {
      manager.restore(id);
    } else if (typeof manager.restoreWindow === 'function') {
      manager.restoreWindow(id);
    } else if (typeof manager.setMinimized === 'function') {
      manager.setMinimized(id, false);
    } else if (typeof manager.updateWindow === 'function') {
      manager.updateWindow(id, { minimized: false });
    }
  }
  return focusWindow(manager, win);
};

const iconPath = (icon: string): string => (icon.startsWith('./') ? icon.slice(1) : icon);

interface DockProps {
  className?: string;
}

const Dock: React.FC<DockProps> = ({ className }) => {
  const [pinned, setPinned] = useState<string[]>(() => loadPinned());
  const [windows, setWindows] = useState<ManagedWindow[]>(() => {
    const manager = getWindowManager();
    if (!manager || typeof manager.getWindows !== 'function') return [];
    try {
      const snapshot = manager.getWindows();
      return Array.isArray(snapshot) ? snapshot : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    savePinned(pinned);
  }, [pinned]);

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PIN_STORAGE_KEY) {
        setPinned(loadPinned());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const manager = getWindowManager();
    if (!manager) return () => {};

    if (typeof manager.getWindows === 'function') {
      try {
        const snapshot = manager.getWindows();
        if (Array.isArray(snapshot)) {
          setWindows(snapshot);
        }
      } catch {
        // ignore snapshot errors
      }
    }

    if (typeof manager.subscribe !== 'function') return () => {};

    const subscription = manager.subscribe((list) => {
      if (Array.isArray(list)) {
        setWindows(list);
      }
    });

    return () => {
      if (typeof subscription === 'function') {
        subscription();
      } else if (subscription && typeof subscription === 'object' && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  const runningByApp = useMemo(() => {
    const map = new Map<string, ManagedWindow[]>();
    windows.forEach((win) => {
      if (!win) return;
      const appId = getWindowAppId(win);
      if (!appId) return;
      if (isWindowClosed(win)) return;
      const bucket = map.get(appId);
      if (bucket) {
        bucket.push(win);
      } else {
        map.set(appId, [win]);
      }
    });
    return map;
  }, [windows]);

  const entries = useMemo<DockEntry[]>(() => {
    const list: DockEntry[] = [];
    const seen = new Set<string>();

    pinned.forEach((id) => {
      const meta = appIndex.get(id);
      if (!meta) return;
      const wins = runningByApp.get(id) ?? [];
      const hasVisibleWindow = wins.some((win) => !isWindowMinimized(win));
      const isActive = wins.some((win) => !isWindowMinimized(win) && isWindowFocused(win));
      list.push({
        app: meta,
        isPinned: true,
        isRunning: wins.length > 0,
        isActive,
        hasVisibleWindow,
        windows: wins,
      });
      seen.add(id);
    });

    runningByApp.forEach((wins, id) => {
      if (seen.has(id)) return;
      const meta = appIndex.get(id);
      if (!meta) return;
      const hasVisibleWindow = wins.some((win) => !isWindowMinimized(win));
      const isActive = wins.some((win) => !isWindowMinimized(win) && isWindowFocused(win));
      list.push({
        app: meta,
        isPinned: false,
        isRunning: true,
        isActive,
        hasVisibleWindow,
        windows: wins,
      });
    });

    return list;
  }, [pinned, runningByApp]);

  const togglePin = useCallback((appId: string) => {
    if (!appIndex.has(appId)) return;
    setPinned((prev) => {
      const next = prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId];
      return normalizePins(next);
    });
  }, []);

  const handleActivate = useCallback(
    (appId: string) => {
      const manager = getWindowManager();
      const wins = runningByApp.get(appId) ?? [];
      if (!manager || wins.length === 0) {
        openApp(manager, appId);
        return;
      }

      const target = wins.find((win) => !isWindowMinimized(win)) ?? wins[0];
      if (!target) {
        openApp(manager, appId);
        return;
      }

      if (isWindowMinimized(target)) {
        restoreWindow(manager, target);
        return;
      }

      if (isWindowFocused(target)) {
        if (!minimizeWindow(manager, target)) {
          focusWindow(manager, target);
        }
        return;
      }

      if (!focusWindow(manager, target)) {
        restoreWindow(manager, target);
      }
    },
    [runningByApp],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, appId: string) => {
      event.preventDefault();
      togglePin(appId);
    },
    [togglePin],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, appId: string) => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        togglePin(appId);
      }
    },
    [togglePin],
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Dock"
      className={joinClassNames(
        'pointer-events-auto text-white',
        className,
      )}
    >
      <ol className="flex flex-col items-center gap-3 rounded-3xl bg-black/60 px-3 py-4 shadow-lg backdrop-blur-xl">
        {entries.map((item) => (
          <li key={item.app.id} className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => handleActivate(item.app.id)}
              onContextMenu={(event) => handleContextMenu(event, item.app.id)}
              onKeyDown={(event) => handleKeyDown(event, item.app.id)}
              data-pinned={item.isPinned ? 'true' : 'false'}
              data-running={item.isRunning ? 'true' : 'false'}
              className={joinClassNames(
                'relative flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-black/60',
                item.isActive
                  ? 'bg-white/20'
                  : item.isRunning
                    ? 'bg-white/10 hover:bg-white/20'
                    : 'bg-white/5 hover:bg-white/15',
                'active:scale-95',
              )}
              title={`${item.app.title}${item.isPinned ? ' (Pinned)' : ''}`}
            >
              <Image
                src={iconPath(item.app.icon)}
                alt={item.app.title}
                width={40}
                height={40}
                className="h-9 w-9 object-contain"
                priority={false}
              />
              <span className="sr-only">
                {item.app.title}
                {item.isPinned ? ' pinned.' : ' unpinned.'}
                {item.isRunning ? ' Running.' : ' Not running.'}
                {' Right-click or press Shift+F10 to toggle pin.'}
              </span>
              {item.isRunning && (
                <span
                  aria-hidden="true"
                  className={joinClassNames(
                    'absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full',
                    item.hasVisibleWindow ? 'bg-ub-orange' : 'bg-white/80',
                  )}
                />
              )}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Dock;
