import React, { useState, useRef, useEffect } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

type BaseItem = {
  /** Optional identifier useful when rendering nested sections */
  id?: string | number;
};

export type ActionMenuItem = BaseItem & {
  type?: 'item';
  label: React.ReactNode;
  onSelect: () => void;
  /** When true the item remains visible but cannot be activated. */
  disabled?: boolean;
};

export type SeparatorMenuItem = BaseItem & {
  type: 'separator';
};

export type SectionMenuItem = BaseItem & {
  type: 'section';
  label: React.ReactNode;
  items: MenuItem[];
};

export type MenuItem = ActionMenuItem | SeparatorMenuItem | SectionMenuItem;

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

  const renderItems = (menuItems: MenuItem[], prefix = 'item'): React.ReactNode =>
    menuItems.map((item, index) => {
      const key = `${prefix}-${item.id ?? index}`;
      if (item.type === 'separator') {
        return (
          <div
            key={key}
            role="separator"
            className="mx-2 my-2 border-t border-white/10"
          />
        );
      }

      if (item.type === 'section') {
        return (
          <div key={key} role="presentation" className="py-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ubt-grey">
              {item.label}
            </p>
            <div className="space-y-0.5 rounded-md px-1">
              {renderItems(item.items, key)}
            </div>
          </div>
        );
      }

      const { onSelect, label, disabled } = item;
      const handleSelect = () => {
        if (disabled) return;
        onSelect();
        setOpen(false);
      };

      return (
        <button
          key={key}
          type="button"
          role="menuitem"
          tabIndex={-1}
          disabled={disabled}
          onClick={handleSelect}
          className={`flex w-full items-center justify-between rounded px-3 py-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-ubt-blue focus:ring-offset-1 focus:ring-offset-gray-900 ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'hover:bg-gray-700/70'
          }`}
        >
          <span className="truncate">{label}</span>
        </button>
      );
    });

  return (
    <div
      role="menu"
      ref={menuRef}
      aria-hidden={!open}
      style={{ left: pos.x, top: pos.y }}
      className={`${
        open ? 'block' : 'hidden'
      } absolute z-50 w-56 cursor-default rounded-lg border border-gray-900 p-2 text-left text-sm text-white shadow-xl context-menu-bg`}
    >
      {renderItems(items)}
    </div>
  );
};

export default ContextMenu;

