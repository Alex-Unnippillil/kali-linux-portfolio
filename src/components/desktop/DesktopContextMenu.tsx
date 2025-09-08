import React, { useEffect, useRef } from 'react';
import useFocusTrap from '../../../hooks/useFocusTrap';
import useRovingTabIndex from '../../../hooks/useRovingTabIndex';

export interface DesktopContextMenuProps {
  /** Position where the menu should appear. `null` hides the menu. */
  position: { x: number; y: number } | null;
  /** Closes the menu */
  onClose: () => void;
  /** Create a new folder */
  onNewFolder?: () => void;
  /** Create a new shortcut */
  onCreateShortcut?: () => void;
  /** Arrange icons to grid */
  onArrange?: () => void;
  /** Change background */
  onChangeBackground?: () => void;
  /** Open terminal */
  onOpenTerminal?: () => void;
  /** Open settings */
  onOpenSettings?: () => void;
  /** Toggle full screen */
  onToggleFullScreen?: () => void;
  /** Clear session */
  onClearSession?: () => void;
}

/**
 * Simple desktop context menu.
 *
 * The component renders nothing when `position` is `null`. Consumers should
 * control the visibility through the `position` prop and call `onClose` to hide
 * the menu when an action is invoked or the user clicks elsewhere.
 */
export const DesktopContextMenu: React.FC<DesktopContextMenuProps> = ({
  position,
  onClose,
  onNewFolder,
  onCreateShortcut,
  onArrange,
  onChangeBackground,
  onOpenTerminal,
  onOpenSettings,
  onToggleFullScreen,
  onClearSession,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useFocusTrap(menuRef, !!position);
  useRovingTabIndex(menuRef, !!position, 'vertical');

  useEffect(() => {
    if (position && menuRef.current) {
      const first = menuRef.current.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]');
      first?.focus();
    }
  }, [position]);

  if (!position) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handle = (cb?: () => void) => () => {
    cb?.();
    onClose();
  };

  return (
    <div
      role="menu"
      aria-label="Desktop context menu"
      ref={menuRef}
      onKeyDown={handleKeyDown}
      className="absolute z-50 w-52 cursor-default select-none rounded border border-gray-700 bg-gray-800 text-sm text-white shadow-lg"
      style={{ top: position.y, left: position.x }}
    >
      <ul className="py-2">
        <li>
          <button
            type="button"
            className="block w-full px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
            onClick={handle(onNewFolder)}
          >
            New Folder
          </button>
        </li>
        <li>
          <button
            type="button"
            className="block w-full px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
            onClick={handle(onCreateShortcut)}
          >
            Create Shortcut...
          </button>
        </li>
        <li className="border-t border-gray-700 mt-1" />
        <li>
          <button
            type="button"
            className="block w-full px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
            onClick={handle(onArrange)}
          >
            Arrange Icons
          </button>
        </li>
        <li className="border-t border-gray-700 mt-1" />
        <li>
          <button
            type="button"
            className="block w-full px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
            onClick={handle(onOpenTerminal)}
          >
            Open in Terminal
          </button>
        </li>
        <li>
          <button
            type="button"
            className="block w-full px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
            onClick={handle(onChangeBackground)}
          >
            Change Background...
          </button>
        </li>
        <li>
          <button
            type="button"
            className="block w-full px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
            onClick={handle(onOpenSettings)}
          >
            Settings
          </button>
        </li>
        <li>
          <button
            type="button"
            className="block w-full px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
            onClick={handle(onToggleFullScreen)}
          >
            Toggle Full Screen
          </button>
        </li>
        <li className="border-t border-gray-700 mt-1" />
        <li>
          <button
            type="button"
            className="block w-full px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
            onClick={handle(onClearSession)}
          >
            Clear Session
          </button>
        </li>
      </ul>
    </div>
  );
};

export default DesktopContextMenu;
