'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import logger from '../../utils/logger';

interface MenuPosition {
  x: number;
  y: number;
}

interface DesktopMenuProps {
  active: boolean;
  position: MenuPosition | null;
  onClose: () => void;
  onAddNewFolder: () => void;
  onOpenShortcutSelector: () => void;
  onOpenTerminal: () => void;
  onChangeWallpaper: () => void;
  onDisplaySettings: () => void;
  onClearSession: () => void;
}

const hiddenStyle: CSSProperties = {
  visibility: 'hidden',
};

const DesktopMenu = ({
  active,
  position,
  onClose,
  onAddNewFolder,
  onOpenShortcutSelector,
  onOpenTerminal,
  onChangeWallpaper,
  onDisplaySettings,
  onClearSession,
}: DesktopMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [coords, setCoords] = useState<MenuPosition | null>(null);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };

    handleFullScreenChange();
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  useFocusTrap(menuRef, active);
  useRovingTabIndex(menuRef, active, 'vertical');

  useEffect(() => {
    if (!active) {
      setCoords(null);
      return;
    }
    if (!position) return;

    const node = menuRef.current;
    if (!node) return;

    const updatePosition = () => {
      const menuWidth = node.offsetWidth;
      const menuHeight = node.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let nextX = position.x;
      let nextY = position.y;

      if (nextX + menuWidth > viewportWidth) {
        nextX = Math.max(0, viewportWidth - menuWidth);
      }

      if (nextY + menuHeight > viewportHeight) {
        nextY = Math.max(0, viewportHeight - menuHeight);
      }

      setCoords({ x: nextX, y: nextY });
    };

    // Wait for the menu to render so offsetWidth/Height are accurate.
    let frameId: number | null = null;
    let timeoutId: number | null = null;
    if (typeof window.requestAnimationFrame === 'function') {
      frameId = window.requestAnimationFrame(updatePosition);
    } else {
      timeoutId = window.setTimeout(updatePosition, 0);
    }
    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [active, position]);

  useEffect(() => {
    if (!active) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [active]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!menuRef.current) return;
    const related = event.relatedTarget as Node | null;
    if (!related || !menuRef.current.contains(related)) {
      onClose();
    }
  };

  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      logger.error(error);
    }
  };

  const finalPosition = useMemo(() => coords ?? position, [coords, position]);

  return (
    <div
      id="desktop-menu"
      role="menu"
      aria-label="Desktop context menu"
      aria-hidden={!active}
      ref={menuRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`${active ? 'block' : 'hidden'} cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm`}
      style={finalPosition ? { left: finalPosition.x, top: finalPosition.y } : hiddenStyle}
    >
      <MenuButton onClick={onAddNewFolder}>New Folder</MenuButton>
      <MenuButton onClick={onOpenShortcutSelector}>Create Shortcut...</MenuButton>
      <Divider />
      <MenuItemDisabled label="Paste" />
      <Divider />
      <MenuItemDisabled label="Show Desktop in Files" />
      <MenuButton onClick={onOpenTerminal}>Open Terminal</MenuButton>
      <Divider />
      <MenuButton onClick={onChangeWallpaper}>Change Wallpaper...</MenuButton>
      <MenuButton onClick={onDisplaySettings}>Display Settings</MenuButton>
      <Divider />
      <MenuButton onClick={toggleFullScreen} ariaLabel={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}>
        {isFullScreen ? 'Exit' : 'Enter'} Full Screen
      </MenuButton>
      <Divider />
      <MenuButton onClick={onClearSession}>Clear Session</MenuButton>
    </div>
  );
};

interface MenuButtonProps {
  children: ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}

const MenuButton = ({ children, onClick, ariaLabel }: MenuButtonProps) => (
  <button
    type="button"
    role="menuitem"
    aria-label={ariaLabel ?? (typeof children === 'string' ? children : undefined)}
    onClick={onClick}
    className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 px-5 cursor-default"
  >
    {children}
  </button>
);

const MenuItemDisabled = ({ label }: { label: string }) => (
  <div
    role="menuitem"
    aria-label={label}
    aria-disabled={true}
    className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400 px-5 cursor-default"
  >
    {label}
  </div>
);

const Divider = () => (
  <div className="flex justify-center w-full">
    <div className="border-t border-gray-900 py-1 w-2/5" />
  </div>
);

export default DesktopMenu;
