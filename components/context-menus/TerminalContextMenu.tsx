'use client';

import React, { useEffect, useRef } from 'react';

export interface TerminalContextMenuProps {
  active: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onOpenFileLocation: () => void;
}

const MENU_WIDTH = 192;
const MENU_HEIGHT = 144;

const TerminalContextMenu: React.FC<TerminalContextMenuProps> = ({
  active,
  position,
  onClose,
  onCopy,
  onPaste,
  onOpenFileLocation,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onClose]);

  const style = {
    top: Math.max(0, position.y),
    left: Math.max(0, position.x),
    minWidth: MENU_WIDTH,
  } as React.CSSProperties;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-hidden={!active}
      className={`${active ? 'block' : 'hidden'} absolute z-50 cursor-default rounded border border-gray-900 bg-gray-900/95 text-left text-sm text-white shadow-lg backdrop-blur`}
      style={style}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onCopy}
        className="block w-full px-4 py-2 text-left hover:bg-gray-700"
      >
        Copy
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onPaste}
        className="block w-full px-4 py-2 text-left hover:bg-gray-700"
      >
        Paste
      </button>
      <div className="mx-4 my-1 border-t border-gray-800" aria-hidden="true" />
      <button
        type="button"
        role="menuitem"
        onClick={onOpenFileLocation}
        className="block w-full px-4 py-2 text-left hover:bg-gray-700"
      >
        Open File Location (Simulated)
      </button>
    </div>
  );
};

export { MENU_HEIGHT, MENU_WIDTH };
export default TerminalContextMenu;
