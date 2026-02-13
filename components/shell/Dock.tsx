"use client";

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import useDockStore from '../../hooks/useDockStore';

export interface DockApp {
  id: string;
  title: string;
  icon: string;
}

export interface DockProps {
  apps: DockApp[];
  runningAppIds?: string[];
  onLaunch?: (id: string) => void;
  onFocus?: (id: string) => void;
  /**
   * Default pinned order used when no stored state exists yet.
   */
  initialPinned?: string[];
  /**
   * Optional storage key override. Useful for isolated tests.
   */
  storageKey?: string;
}

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  appId: string | null;
}

const baseButtonClasses =
  'group relative flex h-12 w-12 items-center justify-center rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';

const iconClasses =
  'h-9 w-9 drop-shadow-[0_0_4px_rgba(0,0,0,0.35)] transition group-hover:scale-105 group-active:scale-95';

const runningIndicatorClasses =
  'absolute -bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-sky-400 group-data-[active="true"]:bg-sky-200';

const menuButtonClasses =
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

const normalizeIds = (ids: string[] = []) => Array.from(new Set(ids));

const Dock = ({
  apps,
  runningAppIds = [],
  onLaunch,
  onFocus,
  initialPinned,
  storageKey,
}: DockProps) => {
  const {
    pinned,
    running,
    togglePin,
    pinApp,
    unpinApp,
    reorderPinned,
    movePinnedByOffset,
    setRunningApps,
    isPinned,
  } = useDockStore({ initialPinned, storageKey });

  const appMap = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps]);
  const normalizedRunning = useMemo(() => normalizeIds(runningAppIds), [runningAppIds]);

  useEffect(() => {
    setRunningApps(normalizedRunning);
  }, [normalizedRunning, setRunningApps]);

  const pinnedItems = useMemo(
    () => pinned.map((id) => appMap.get(id)).filter(Boolean) as DockApp[],
    [appMap, pinned],
  );
  const runningItems = useMemo(
    () => running.map((id) => appMap.get(id)).filter(Boolean) as DockApp[],
    [appMap, running],
  );

  const items = [...pinnedItems, ...runningItems];

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const [menuState, setMenuState] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    appId: null,
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeMenu = (event: globalThis.MouseEvent) => {
      if (!menuState.open) return;
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuState({ open: false, x: 0, y: 0, appId: null });
      }
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (menuState.open && event.key === 'Escape') {
        setMenuState({ open: false, x: 0, y: 0, appId: null });
      }
    };
    document.addEventListener('mousedown', closeMenu as EventListener);
    document.addEventListener('keydown', handleEscape as EventListener);
    return () => {
      document.removeEventListener('mousedown', closeMenu as EventListener);
      document.removeEventListener('keydown', handleEscape as EventListener);
    };
  }, [menuState.open]);

  useEffect(() => {
    if (!menuState.open || !menuRef.current) return;
    const focusable = menuRef.current.querySelector<HTMLButtonElement>('button');
    focusable?.focus();
  }, [menuState.open]);

  const openContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement> | ReactKeyboardEvent<HTMLButtonElement>, appId: string) => {
      event.preventDefault();
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuState({
        open: true,
        x: 'clientX' in event ? event.clientX : rect.left,
        y: 'clientY' in event ? event.clientY : rect.bottom,
        appId,
      });
    },
    [],
  );

  const handleMenuAction = useCallback(
    (action: 'pin' | 'unpin' | 'left' | 'right') => {
      const targetId = menuState.appId;
      if (!targetId) return;
      if (action === 'pin') {
        pinApp(targetId);
      } else if (action === 'unpin') {
        unpinApp(targetId);
      } else if (action === 'left') {
        movePinnedByOffset(targetId, -1);
      } else if (action === 'right') {
        movePinnedByOffset(targetId, 1);
      }
      setMenuState({ open: false, x: 0, y: 0, appId: null });
    },
    [menuState.appId, movePinnedByOffset, pinApp, unpinApp],
  );

  const handleLaunch = useCallback(
    (id: string) => {
      if (onLaunch) onLaunch(id);
      else if (onFocus) onFocus(id);
    },
    [onFocus, onLaunch],
  );

  const handleDragStart = useCallback(
    (event: ReactDragEvent<HTMLButtonElement>, id: string) => {
      if (!isPinned(id)) return;
      setDraggingId(id);
      dragIdRef.current = id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    },
    [isPinned],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    dragIdRef.current = null;
  }, []);

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>, targetId: string | null) => {
      event.preventDefault();
      const sourceId = event.dataTransfer.getData('text/plain') || dragIdRef.current;
      if (!sourceId || !isPinned(sourceId)) return;
      const fromIndex = pinned.indexOf(sourceId);
      if (fromIndex === -1) return;
      const toIndex = targetId ? pinned.indexOf(targetId) : pinned.length - 1;
      if (toIndex === -1) return;
      reorderPinned(fromIndex, toIndex);
      setDraggingId(null);
      dragIdRef.current = null;
    },
    [isPinned, pinned, reorderPinned],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, id: string) => {
      if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
        openContextMenu(event, id);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        togglePin(id);
        return;
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        movePinnedByOffset(id, -1);
        return;
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        movePinnedByOffset(id, 1);
        return;
      }
    },
    [movePinnedByOffset, openContextMenu, togglePin],
  );

  return (
    <nav
      aria-label="Dock"
      className="pointer-events-auto flex h-full w-16 select-none flex-col items-center gap-2 bg-black/50 py-4 text-white backdrop-blur"
    >
      <ul className="flex h-full flex-col items-center gap-3" role="menubar">
        {items.map((item) => {
          const pinnedStatus = isPinned(item.id);
          const isActive = normalizedRunning.includes(item.id);
          return (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={[
                  baseButtonClasses,
                  pinnedStatus ? 'cursor-grab' : 'cursor-default',
                  draggingId === item.id ? 'opacity-50' : 'opacity-100',
                ].join(' ')}
                onClick={() => handleLaunch(item.id)}
                onContextMenu={(event) => openContextMenu(event, item.id)}
                onKeyDown={(event) => handleKeyDown(event, item.id)}
                draggable={pinnedStatus}
                onDragStart={(event) => handleDragStart(event, item.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, item.id)}
                data-active={String(isActive)}
                data-pinned={String(pinnedStatus)}
                aria-pressed={isActive}
                aria-haspopup="menu"
              >
                <Image
                  src={item.icon}
                  alt={item.title}
                  width={36}
                  height={36}
                  className={iconClasses}
                />
                {isActive && <span data-testid="running-indicator" className={runningIndicatorClasses} />}
              </button>
            </li>
          );
        })}
      </ul>
      <div
        className="mt-auto h-12 w-12"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, null)}
      />
      {menuState.open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Dock item options"
          className="fixed z-50 min-w-[12rem] rounded-lg border border-white/10 bg-black/80 p-2 shadow-lg backdrop-blur"
          style={{ left: menuState.x, top: menuState.y }}
        >
          {menuState.appId && !isPinned(menuState.appId) && (
            <button
              type="button"
              role="menuitem"
              className={menuButtonClasses}
              onClick={() => handleMenuAction('pin')}
            >
              Pin to Dock
            </button>
          )}
          {menuState.appId && isPinned(menuState.appId) && (
            <>
              <button
                type="button"
                role="menuitem"
                className={menuButtonClasses}
                onClick={() => handleMenuAction('unpin')}
              >
                Unpin from Dock
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuButtonClasses}
                onClick={() => handleMenuAction('left')}
              >
                Move Left
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuButtonClasses}
                onClick={() => handleMenuAction('right')}
              >
                Move Right
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Dock;
