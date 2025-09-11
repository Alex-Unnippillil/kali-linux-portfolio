import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

interface WindowMenuProps {
  targetRef: React.RefObject<HTMLElement>;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  maximized: boolean;
}

const WindowMenu: React.FC<WindowMenuProps> = ({
  targetRef,
  onMinimize,
  onMaximize,
  onClose,
  maximized,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, open);
  useRovingTabIndex(menuRef as React.RefObject<HTMLElement>, open, 'vertical');

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const openMenu = (x: number, y: number) => {
      setPos({ x, y });
      setOpen(true);
      requestAnimationFrame(() => {
        const menu = menuRef.current;
        if (!menu) return;
        const { offsetWidth, offsetHeight } = menu;
        let newX = x;
        let newY = y;
        if (newX + offsetWidth > window.innerWidth) newX = Math.max(0, newX - offsetWidth);
        if (newY + offsetHeight > window.innerHeight) newY = Math.max(0, newY - offsetHeight);
        setPos({ x: newX, y: newY });
      });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu(e.pageX, e.pageY);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F10') {
        e.preventDefault();
        const rect = node.getBoundingClientRect();
        openMenu(rect.left, rect.bottom);
      }
    };

    node.addEventListener('contextmenu', handleContextMenu);
    node.addEventListener('keydown', handleKeyDown);
    return () => {
      node.removeEventListener('contextmenu', handleContextMenu);
      node.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetRef]);

  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent('context-menu-open'));
    } else {
      window.dispatchEvent(new CustomEvent('context-menu-close'));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleMinimize = () => {
    onMinimize();
    setOpen(false);
  };

  const handleMaximize = () => {
    onMaximize();
    setOpen(false);
  };

  const handleClose = () => {
    onClose();
    setOpen(false);
  };

  if (!open) return null;

  const menu = (
    <div
      role="menu"
      ref={menuRef}
      aria-hidden={!open}
      style={{ left: pos.x, top: pos.y }}
      className="cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm"
    >
      <button
        type="button"
        role="menuitem"
        aria-label="Minimize Window"
        onClick={handleMinimize}
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Minimize</span>
      </button>
      <button
        type="button"
        role="menuitem"
        aria-label={maximized ? 'Restore Window' : 'Maximize Window'}
        onClick={handleMaximize}
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">{maximized ? 'Restore' : 'Maximize'}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        aria-label="Close Window"
        onClick={handleClose}
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Close</span>
      </button>
    </div>
  );

  return createPortal(menu, document.body);
};

export default WindowMenu;

