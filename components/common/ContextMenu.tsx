import React, { useState, useRef, useEffect } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

export type MenuItem =
  | {
      type?: 'item';
      label: React.ReactNode;
      onSelect: () => void;
      role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
      checked?: boolean;
      disabled?: boolean;
    }
  | {
      type: 'separator';
    };

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
      if (
        (e.shiftKey && e.key === 'F10') ||
        e.key === 'ContextMenu' ||
        e.key === 'Apps'
      ) {
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

  useEffect(() => {
    if (!open) return;
    const firstButton = menuRef.current?.querySelector<HTMLButtonElement>(
      'button:not([disabled])',
    );
    firstButton?.focus();
  }, [open]);

  if (!items.length) return null;

  return (
    <div
      role="menu"
      ref={menuRef}
      aria-hidden={!open}
      style={{ left: pos.x, top: pos.y }}
      className={(open ? 'block ' : 'hidden ') +
        'cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
    >
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return (
            <div
              key={`separator-${i}`}
              role="none"
              className="my-1 border-t border-gray-900/60"
            />
          );
        }
        const {
          role = item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem',
          checked,
          disabled,
        } = item;
        return (
          <button
            key={`item-${i}`}
            role={role}
            aria-checked={role !== 'menuitem' ? checked : undefined}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            tabIndex={-1}
            onClick={() => {
              if (disabled) return;
              item.onSelect();
              setOpen(false);
            }}
            className={`w-full text-left cursor-default py-1 px-3 text-sm transition-colors ${
              disabled
                ? 'text-white/40'
                : 'hover:bg-gray-700 focus:bg-gray-700 focus:outline-none'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;

