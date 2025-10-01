import React, { useState, useRef, useEffect } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import useEscapeKey from '../../hooks/useEscapeKey';

export interface MenuItem {
  label: React.ReactNode;
  onSelect: () => void;
}

interface ContextMenuProps {
  /** Element that triggers this context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Menu items to render */
  items: MenuItem[];
}

/**
 * Accessible context menu that supports right click and Shift+F10
 * activation. Uses roving tab index for keyboard navigation and
 * dispatches global events when opened/closed so backgrounds can
 * be made inert.
 */
const ContextMenu: React.FC<ContextMenuProps> = ({ targetRef, items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useFocusTrap(menuRef, open, {
    restoreFocus: false,
  });
  useRovingTabIndex(menuRef, open, 'vertical');

  useEscapeKey(() => setOpen(false), open);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        targetRef.current?.focus();
      }
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    const firstMenuItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstMenuItem?.focus();
  }, [open, targetRef]);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.pageX, y: e.pageY });
      setOpen(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F10') {
        e.preventDefault();
        const rect = node.getBoundingClientRect();
        setPos({ x: rect.left, y: rect.bottom });
        setOpen(true);
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

    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  return (
    <div
      role="menu"
      ref={menuRef}
      aria-hidden={!open}
      style={{ left: pos.x, top: pos.y }}
      className={(open ? 'block ' : 'hidden ') +
        'cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
    >
      {items.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          tabIndex={-1}
          onClick={() => {
            item.onSelect();
            setOpen(false);
          }}
          className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;

