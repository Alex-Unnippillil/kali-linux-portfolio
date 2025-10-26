import React, { useState, useRef, useEffect, useCallback } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import useEscapeStack from '../../hooks/useEscapeStack';

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
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, open);
  useRovingTabIndex(
    menuRef as React.RefObject<HTMLElement>,
    open,
    'vertical',
  );

  useEscapeStack(open, closeMenu);

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
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;

    const trigger = targetRef.current ?? (document.activeElement as HTMLElement | null);
    triggerElementRef.current = trigger;

    const frame = requestAnimationFrame(() => {
      const focusTarget =
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"][tabindex="0"]') ||
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      focusTarget?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      const fallbackTrigger = targetRef.current;
      const triggerEl =
        triggerElementRef.current && triggerElementRef.current.isConnected
          ? triggerElementRef.current
          : fallbackTrigger;
      if (triggerEl && typeof triggerEl.focus === 'function') {
        triggerEl.focus();
      }
      triggerElementRef.current = null;
    };
  }, [open, targetRef]);

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
            closeMenu();
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

