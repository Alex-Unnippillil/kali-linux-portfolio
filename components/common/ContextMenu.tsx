import React, { useState, useRef, useEffect } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import TouchContextMenuTrigger from '../../utils/touchContextMenuTrigger';

export interface MenuItem {
  label: React.ReactNode;
  onSelect: () => void;
}

interface ContextMenuProps {
  /** Element that triggers this context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Menu items to render */
  items: MenuItem[];
  /** Optional delay for touch long-press activation (ms) */
  longPressDelay?: number;
}

/**
 * Accessible context menu that supports right click and Shift+F10
 * activation. Uses roving tab index for keyboard navigation and
 * dispatches global events when opened/closed so backgrounds can
 * be made inert.
 */
const ContextMenu: React.FC<ContextMenuProps> = ({ targetRef, items, longPressDelay = 600 }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, open);
  useRovingTabIndex(
    menuRef as React.RefObject<HTMLElement>,
    open,
    'vertical',
  );

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
    const node = targetRef.current;
    if (!node) return;

    const trigger = new TouchContextMenuTrigger({
      delay: longPressDelay,
      onTrigger: ({ pageX, pageY }) => {
        setPos({ x: pageX, y: pageY });
        setOpen(true);
      },
    });

    const handlePointerDown = (event: PointerEvent) => {
      trigger.begin(event);
    };
    const handlePointerMove = (event: PointerEvent) => {
      trigger.move(event);
    };
    const handlePointerUp = (event: PointerEvent) => {
      trigger.end(event);
    };
    const handlePointerCancel = (event: PointerEvent) => {
      trigger.cancel(event);
    };

    node.addEventListener('pointerdown', handlePointerDown);
    node.addEventListener('pointermove', handlePointerMove);
    node.addEventListener('pointerup', handlePointerUp);
    node.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('pointermove', handlePointerMove);
      node.removeEventListener('pointerup', handlePointerUp);
      node.removeEventListener('pointercancel', handlePointerCancel);
      trigger.dispose();
    };
  }, [targetRef, longPressDelay]);

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
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div
      role="menu"
      ref={menuRef}
      aria-hidden={!open}
      style={{ left: pos.x, top: pos.y }}
      className={(open ? 'block ' : 'hidden ') +
        'cursor-default context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm shadow-xl overflow-y-auto backdrop-blur-md'}
      style={{
        width: 'min(14rem, calc(100vw - 1.5rem))',
        maxHeight: 'calc(100vh - 2rem)',
      }}
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

