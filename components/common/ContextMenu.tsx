import React, { useState, useRef, useEffect } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

export interface MenuItem {
  /**
   * Stable identifier for the menu item so React can key it and
   * callers can memoize item arrays.
   */
  id: string;
  /** Primary label rendered for the menu option. */
  label: React.ReactNode;
  /** Optional visual icon that appears before the label. */
  icon?: React.ReactNode;
  /** Optional keyboard accelerator text aligned to the right. */
  accel?: string;
  /**
   * When true the item is rendered in a disabled state and the
   * `onSelect` handler will not run.
   */
  disabled?: boolean;
  /** Invoked when the menu item is activated. */
  onSelect: () => void;
}

interface ContextMenuProps {
  /** Element that triggers this context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Menu items to render */
  items: MenuItem[];
}

interface MenuItemsListProps {
  /** Items to render in order */
  items: MenuItem[];
  /** Optional callback fired after the item's `onSelect` runs */
  onItemSelect?: (item: MenuItem) => void;
  /**
   * Additional classes for interactive (non-disabled) menu items to
   * customize hover styles when reusing the renderer.
   */
  itemClassName?: string;
}

export const MenuItemsList: React.FC<MenuItemsListProps> = ({
  items,
  onItemSelect,
  itemClassName,
}) => (
  <>
    {items.map((item) => {
      const stringLabel =
        typeof item.label === 'string' ? item.label : undefined;
      const isDisabled = Boolean(item.disabled);

      return (
        <button
          key={item.id}
          role="menuitem"
          tabIndex={-1}
          type="button"
          aria-label={stringLabel}
          aria-disabled={isDisabled}
          disabled={isDisabled}
          onClick={() => {
            if (isDisabled) return;
            item.onSelect();
            onItemSelect?.(item);
          }}
          className={
            'w-full text-left cursor-default py-0.5 mb-1.5 px-4 flex items-center justify-between gap-3 rounded-sm transition-colors ' +
            (isDisabled
              ? 'text-gray-400 cursor-not-allowed hover:bg-transparent'
              : itemClassName || 'hover:bg-gray-700')
          }
        >
          <span className="flex items-center gap-2">
            {item.icon ? (
              <span aria-hidden className="text-base leading-none">
                {item.icon}
              </span>
            ) : null}
            <span className="truncate">{item.label}</span>
          </span>
          {item.accel ? (
            <span className="text-xs text-gray-400">{item.accel}</span>
          ) : null}
        </button>
      );
    })}
  </>
);

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
        'cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
    >
      <MenuItemsList items={items} onItemSelect={() => setOpen(false)} />
    </div>
  );
};

export default ContextMenu;

