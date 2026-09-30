'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

const MENU_SAFE_PADDING = 8;

interface DesktopProps {
  children?: React.ReactNode;
  className?: string;
  /** Handler invoked when the user selects "New folder" from the desktop menu. */
  onCreateFolder: () => void;
  /** Handler invoked when the user selects "Change wallpaper" from the desktop menu. */
  onChangeWallpaper: () => void;
  /** Handler invoked when the user selects "Settings" from the desktop menu. */
  onOpenSettings: () => void;
}

type MenuPosition = { x: number; y: number } | null;

const MENU_WIDTH = 208; // tailwind w-52

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const Desktop: React.FC<DesktopProps> = ({
  children,
  className,
  onCreateFolder,
  onChangeWallpaper,
  onOpenSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(null);

  const openMenuAt = useCallback((clientX: number, clientY: number) => {
    if (typeof window === 'undefined') return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const xMax = Math.max(width - MENU_WIDTH - MENU_SAFE_PADDING, 0);
    const yMax = Math.max(height - MENU_SAFE_PADDING, 0);
    setMenuPosition({
      x: clamp(clientX, MENU_SAFE_PADDING, xMax),
      y: clamp(clientY, MENU_SAFE_PADDING, yMax),
    });
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      openMenuAt(event.clientX, event.clientY);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
        event.preventDefault();
        const rect = node.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        openMenuAt(centerX, centerY);
      }
    };

    node.addEventListener('contextmenu', handleContextMenu);
    node.addEventListener('keydown', handleKeyDown);

    return () => {
      node.removeEventListener('contextmenu', handleContextMenu);
      node.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuAt]);

  useEffect(() => {
    if (!menuPosition) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuPosition(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuPosition]);

  useEffect(() => {
    if (!menuPosition || !menuRef.current) return;

    const { offsetWidth, offsetHeight } = menuRef.current;
    const xMax = Math.max(window.innerWidth - offsetWidth - MENU_SAFE_PADDING, 0);
    const yMax = Math.max(window.innerHeight - offsetHeight - MENU_SAFE_PADDING, 0);
    const nextX = clamp(menuPosition.x, MENU_SAFE_PADDING, xMax);
    const nextY = clamp(menuPosition.y, MENU_SAFE_PADDING, yMax);

    if (nextX !== menuPosition.x || nextY !== menuPosition.y) {
      setMenuPosition({ x: nextX, y: nextY });
    }
  }, [menuPosition]);

  useEffect(() => {
    if (!menuPosition) {
      if (wasOpenRef.current) {
        containerRef.current?.focus();
      }
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;

    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [menuPosition]);

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, Boolean(menuPosition));
  useRovingTabIndex(menuRef as React.RefObject<HTMLElement>, Boolean(menuPosition), 'vertical');

  const handleSelect = useCallback(
    (callback: () => void) => () => {
      callback();
      setMenuPosition(null);
    },
    [],
  );

  const items = useMemo(
    () => [
      { label: 'New folder', action: onCreateFolder },
      { label: 'Change wallpaper', action: onChangeWallpaper },
      { label: 'Settings', action: onOpenSettings },
    ],
    [onCreateFolder, onChangeWallpaper, onOpenSettings],
  );

  return (
    <div className={['relative h-full w-full', className].filter(Boolean).join(' ')}>
      <div
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-label="Desktop workspace"
        data-testid="desktop"
        className="h-full w-full focus:outline-none"
      >
        {children}
      </div>

      {menuPosition && (
        <>
          <div
            role="menu"
            aria-label="Desktop context menu"
            ref={menuRef}
            className="fixed z-50 w-52 cursor-default rounded border border-gray-900 bg-black/90 py-2 text-left text-sm text-white shadow-lg focus:outline-none"
            style={{ left: menuPosition.x, top: menuPosition.y }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={handleSelect(item.action)}
                className="flex w-full items-center px-4 py-2 text-left hover:bg-white/10 focus:bg-white/10"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            aria-hidden="true"
            data-testid="desktop-context-overlay"
            className="fixed inset-0 z-40 bg-black/30"
            onMouseDown={() => setMenuPosition(null)}
          />
        </>
      )}
    </div>
  );
};

export default Desktop;
