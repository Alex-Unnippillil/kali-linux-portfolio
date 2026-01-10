'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { DragEvent } from 'react';
import Image from 'next/image';
import usePersistentState from '../../hooks/usePersistentState';
import rawApps from '../../apps.config';

export interface AppShortcut {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
}

type QuickLaunchProps = {
  apps?: AppShortcut[];
  onLaunch?: (id: string) => void;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

type RawApp = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const DEFAULT_APPS: AppShortcut[] = (rawApps as RawApp[]).map(
  ({ id, title, icon, disabled, favourite }) => ({
    id,
    title,
    icon,
    disabled,
    favourite,
  })
);

const normalizePins = (ids: string[], map: Map<string, AppShortcut>) => {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!map.has(id) || seen.has(id)) continue;
    normalized.push(id);
    seen.add(id);
  }
  return normalized;
};

const isEditableElement = (element: Element | null) => {
  if (!element) return false;
  const tagName = element.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (tagName === 'BUTTON') {
    return true;
  }
  return (element as HTMLElement).isContentEditable;
};

const QuickLaunch = ({ apps: providedApps, onLaunch }: QuickLaunchProps) => {
  const availableApps = useMemo(() => {
    const source = providedApps ?? DEFAULT_APPS;
    const seen = new Set<string>();
    return source.filter((app) => {
      if (!app.id || !app.title || !app.icon) return false;
      if (app.disabled) return false;
      if (seen.has(app.id)) return false;
      seen.add(app.id);
      return true;
    });
  }, [providedApps]);

  const appMap = useMemo(() => {
    const map = new Map<string, AppShortcut>();
    for (const app of availableApps) {
      map.set(app.id, app);
    }
    return map;
  }, [availableApps]);

  const defaultPinned = useMemo(
    () => availableApps.filter((app) => app.favourite).map((app) => app.id),
    [availableApps]
  );

  const [pinned, setPinned] = usePersistentState<string[]>(
    'quick-launch-pins',
    defaultPinned,
    isStringArray
  );

  const normalizedPinned = useMemo(
    () => normalizePins(pinned, appMap),
    [pinned, appMap]
  );

  useEffect(() => {
    const needsUpdate =
      pinned.length !== normalizedPinned.length ||
      pinned.some((id, index) => normalizedPinned[index] !== id);
    if (needsUpdate) {
      setPinned(normalizedPinned);
    }
  }, [normalizedPinned, pinned, setPinned]);

  const availableForPin = useMemo(
    () => availableApps.filter((app) => !normalizedPinned.includes(app.id)),
    [availableApps, normalizedPinned]
  );

  const dragSourceId = useRef<string | null>(null);

  const launch = useCallback(
    (id: string) => {
      if (!appMap.has(id)) return;
      if (onLaunch) {
        onLaunch(id);
      } else {
        window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
      }
    },
    [appMap, onLaunch]
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, id: string) => {
      dragSourceId.current = id;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        try {
          event.dataTransfer.setData('text/plain', id);
        } catch {
          // Ignore errors from unsupported browsers
        }
      }
    },
    []
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLButtonElement>, targetId: string) => {
      event.preventDefault();
      const sourceId = event.dataTransfer?.getData('text/plain') || dragSourceId.current;
      dragSourceId.current = null;
      if (!sourceId || sourceId === targetId) return;

      const sourceIndex = normalizedPinned.indexOf(sourceId);
      const targetIndex = normalizedPinned.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return;

      const updated = [...normalizedPinned];
      updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, sourceId);
      setPinned(updated);
    },
    [normalizedPinned, setPinned]
  );

  const handleDragEnd = useCallback(() => {
    dragSourceId.current = null;
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      setPinned(normalizedPinned.filter((item) => item !== id));
    },
    [normalizedPinned, setPinned]
  );

  const handleAdd = useCallback(
    (id: string) => {
      if (!id || normalizedPinned.includes(id) || !appMap.has(id)) return;
      setPinned([...normalizedPinned, id]);
    },
    [appMap, normalizedPinned, setPinned]
  );

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (!/^[1-9]$/.test(event.key)) {
        return;
      }
      if (isEditableElement(document.activeElement)) {
        return;
      }

      const index = Number(event.key) - 1;
      const id = normalizedPinned[index];
      if (!id) return;
      event.preventDefault();
      launch(id);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [normalizedPinned, launch]);

  return (
    <nav
      aria-label="Quick launch"
      className="flex items-center gap-3 rounded-md bg-black/40 px-3 py-2 text-white backdrop-blur"
    >
      <ul className="flex list-none items-center gap-2 p-0" role="list">
        {normalizedPinned.map((id, index) => {
          const app = appMap.get(id);
          if (!app) return null;
          const hotkeyNumber = index < 9 ? index + 1 : null;
          const ariaLabel = `Launch ${app.title}${hotkeyNumber ? ` (Alt+${hotkeyNumber})` : ''}`;
          return (
            <li key={id} className="relative">
              <button
                type="button"
                aria-label={ariaLabel}
                title={`${app.title}${hotkeyNumber ? ` · Alt+${hotkeyNumber}` : ''}`}
                className="relative flex h-12 w-12 items-center justify-center rounded-md bg-white/10 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
                onClick={() => launch(id)}
                draggable
                onDragStart={(event) => handleDragStart(event, id)}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, id)}
                onDragEnd={handleDragEnd}
                data-hotkey={hotkeyNumber ?? undefined}
              >
                <Image
                  src={app.icon.replace('./', '/')}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                {hotkeyNumber && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ubt-blue px-1 text-xs font-semibold text-black">
                    {hotkeyNumber}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white transition hover:bg-black"
                aria-label={`Unpin ${app.title}`}
                onClick={() => handleRemove(id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          );
        })}
        {normalizedPinned.length === 0 && (
          <li className="text-sm text-white/70">Pin apps for quick access</li>
        )}
      </ul>
      {availableForPin.length > 0 && (
        <div>
          <label htmlFor="quick-launch-add" className="sr-only">
            Pin application
          </label>
          <select
            id="quick-launch-add"
            defaultValue=""
            className="rounded-md bg-black/30 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ubt-blue"
            onChange={(event) => {
              const value = event.target.value;
              handleAdd(value);
              event.target.value = '';
            }}
          >
            <option value="" disabled>
              Pin application…
            </option>
            {availableForPin.map((app) => (
              <option key={app.id} value={app.id}>
                {app.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </nav>
  );
};

export default QuickLaunch;
