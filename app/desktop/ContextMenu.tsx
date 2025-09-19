'use client';

import { useCallback, useEffect, useState } from 'react';

type Coordinates = {
  x: number;
  y: number;
};

const MENU_WIDTH = 208;
const MENU_HEIGHT = 200;
const ACTIONS = ['New File', 'New Folder', 'Paste', 'Refresh', 'Display Settings'];

const DesktopContextMenu = () => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<Coordinates>({ x: 0, y: 0 });

  const closeMenu = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      const { clientX, clientY } = event;
      const clampedX = Math.min(
        clientX,
        Math.max(0, window.innerWidth - MENU_WIDTH),
      );
      const clampedY = Math.min(
        clientY,
        Math.max(0, window.innerHeight - MENU_HEIGHT),
      );

      setPosition({ x: clampedX, y: clampedY });
      setVisible(true);
    };

    const handleDocumentClick = () => {
      closeMenu();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [closeMenu]);

  return (
    <div
      className={`fixed z-50 w-52 overflow-hidden rounded-md border border-slate-700 bg-slate-900/95 text-slate-50 shadow-lg transition-opacity ${
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-hidden={!visible}
    >
      <ul className="py-2">
        {ACTIONS.map((action) => (
          <li key={action}>
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-default items-center gap-2 px-4 py-1.5 text-left text-sm hover:bg-slate-700 focus:bg-slate-700 focus:outline-none"
              onClick={closeMenu}
            >
              {action}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DesktopContextMenu;
