import React, { useEffect, useMemo, useRef, useState } from 'react';
import OverviewMenu, {
  WorkspaceOption,
} from '../context-menus/overview-menu';

type WindowMeta = {
  id: string;
  title: string;
};

type MenuState = {
  open: boolean;
  x: number;
  y: number;
  windowId: string | null;
};

interface WindowSwitcherProps {
  windows?: WindowMeta[];
  minimizedMap?: Record<string, boolean>;
  windowWorkspaces?: Record<string, string>;
  workspaces?: WorkspaceOption[];
  onSelect?: (id: string) => void;
  onClose?: () => void;
  onCloseWindow?: (id: string) => void;
  onToggleMinimize?: (id: string) => void;
  onMoveWindow?: (id: string, workspaceId: string) => void;
}

const MENU_OFFSET = 8;

const WindowSwitcher: React.FC<WindowSwitcherProps> = ({
  windows = [],
  minimizedMap = {},
  windowWorkspaces = {},
  workspaces = [],
  onSelect,
  onClose,
  onCloseWindow,
  onToggleMinimize,
  onMoveWindow,
}) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [menuState, setMenuState] = useState<MenuState>({
    open: false,
    x: 0,
    y: 0,
    windowId: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      windows.filter((w) =>
        w.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [windows, query],
  );

  const workspaceOptions = useMemo<WorkspaceOption[]>(
    () =>
      workspaces && workspaces.length
        ? workspaces
        : [
            { id: 'workspace-1', name: 'Workspace 1' },
            { id: 'workspace-2', name: 'Workspace 2' },
          ],
    [workspaces],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        const win = filtered[selected];
        if (win && typeof onSelect === 'function') {
          onSelect(win.id);
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [filtered, selected, onSelect, onClose]);

  useEffect(() => {
    if (selected >= filtered.length) {
      setSelected(filtered.length ? filtered.length - 1 : 0);
    }
  }, [filtered, selected]);

  useEffect(() => {
    if (!menuState.open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuState({ open: false, x: 0, y: 0, windowId: null });
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [menuState.open]);

  useEffect(() => {
    if (!menuState.open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let nextX = menuState.x;
    let nextY = menuState.y;
    if (rect.right > window.innerWidth) {
      nextX = Math.max(0, window.innerWidth - rect.width - MENU_OFFSET);
    }
    if (rect.bottom > window.innerHeight) {
      nextY = Math.max(0, window.innerHeight - rect.height - MENU_OFFSET);
    }
    if (nextX !== menuState.x || nextY !== menuState.y) {
      setMenuState((prev) => ({ ...prev, x: nextX, y: nextY }));
    }
  }, [menuState.open, menuState.x, menuState.y]);

  const closeMenu = () => {
    setMenuState({ open: false, x: 0, y: 0, windowId: null });
  };

  const openMenu = (id: string, clientX?: number, clientY?: number) => {
    const rect = listRef.current?.querySelector<HTMLElement>(
      `[data-window-id="${id}"]`,
    )?.getBoundingClientRect();

    const x =
      clientX !== undefined
        ? clientX
        : rect
        ? rect.left + rect.width / 2
        : window.innerWidth / 2;
    const y =
      clientY !== undefined
        ? clientY
        : rect
        ? rect.bottom
        : window.innerHeight / 2;

    setMenuState({ open: true, x, y, windowId: id });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      const dir = e.shiftKey ? -1 : 1;
      setSelected((prev) => (prev + dir + len) % len);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      setSelected((prev) => (prev + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      setSelected((prev) => (prev - 1 + len) % len);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (menuState.open) {
        closeMenu();
      } else if (typeof onClose === 'function') {
        onClose();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelected(0);
  };

  const handleItemContextMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    e.preventDefault();
    openMenu(id, e.clientX, e.clientY);
    const index = filtered.findIndex((w) => w.id === id);
    if (index !== -1) setSelected(index);
  };

  const handleItemKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    id: string,
  ) => {
    if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      openMenu(id, rect.left + rect.width / 2, rect.bottom);
      const index = filtered.findIndex((w) => w.id === id);
      if (index !== -1) setSelected(index);
    }
  };

  const handleSelect = (id: string) => {
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
  };

  const currentWorkspace = menuState.windowId
    ? windowWorkspaces[menuState.windowId]
    : undefined;

  const isMinimized = menuState.windowId
    ? !!minimizedMap[menuState.windowId]
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="relative bg-ub-grey p-4 rounded w-3/4 md:w-1/3">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          placeholder="Search windows"
        />
        <ul ref={listRef} className="space-y-1">
          {filtered.map((w, i) => (
            <li key={w.id}>
              <button
                type="button"
                data-window-id={w.id}
                onClick={() => handleSelect(w.id)}
                onContextMenu={(e) => handleItemContextMenu(e, w.id)}
                onKeyDown={(e) => handleItemKeyDown(e, w.id)}
                className={`w-full text-left px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                  i === selected ? 'bg-ub-orange text-black' : ''
                }`}
              >
                {w.title}
              </button>
            </li>
          ))}
        </ul>
        <OverviewMenu
          ref={menuRef}
          active={menuState.open}
          anchorPoint={{ x: menuState.x, y: menuState.y }}
          minimized={isMinimized}
          workspaces={workspaceOptions}
          currentWorkspace={currentWorkspace}
          onCloseMenu={closeMenu}
          onClose={() => {
            if (menuState.windowId && onCloseWindow) {
              onCloseWindow(menuState.windowId);
            }
          }}
          onToggleMinimize={() => {
            if (menuState.windowId && onToggleMinimize) {
              onToggleMinimize(menuState.windowId);
            }
          }}
          onMoveToWorkspace={(workspaceId) => {
            if (menuState.windowId && onMoveWindow) {
              onMoveWindow(menuState.windowId, workspaceId);
            }
          }}
        />
      </div>
    </div>
  );
};

export default WindowSwitcher;
