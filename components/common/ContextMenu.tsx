import React, { useState, useRef, useEffect } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

/** Definition of a single menu entry. */
export interface MenuItem {
  /** Text or element to display for this item. */
  label?: React.ReactNode;
  /** Function invoked when the item is selected. */
  onSelect?: () => void;
  /** Child menu items to render as a submenu. */
  submenu?: MenuItem[];
  /** Render a visual separator when true. */
  separator?: boolean;
}

interface ContextMenuProps {
  /** Element that triggers this context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Menu items to render */
  items: MenuItem[];
  /** Optional accessible label for the menu */
  ariaLabel?: string;
  /** ID of element that labels the menu */
  ariaLabelledBy?: string;
}

/**
 * Accessible context menu that supports right click and Shift+F10
 * activation. Uses roving tab index for keyboard navigation and
 * dispatches global events when opened/closed so backgrounds can
 * be made inert.
 */
const ContextMenu: React.FC<ContextMenuProps> = ({
  targetRef,
  items,
  ariaLabel = 'Context menu',
  ariaLabelledBy,
}) => {
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
    if (open && menuRef.current) {
      const first = menuRef.current.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]');
      first?.focus();
    }
  }, [open]);

  const close = () => setOpen(false);

  /** Recursively renders a panel of menu items. */
  const MenuPanel: React.FC<{ items: MenuItem[] }> = ({ items }) => {
    const [subIndex, setSubIndex] = useState<number | null>(null);
    const [submenuDir, setSubmenuDir] = useState<'left' | 'right'>('right');
    const [submenuOffset, setSubmenuOffset] = useState(0);
    const submenuRef = useRef<HTMLDivElement>(null);
    const SUBMENU_WIDTH = 208; // w-52

    useEffect(() => {
      if (subIndex === null) return;
      const rect = submenuRef.current?.getBoundingClientRect();
      if (!rect) return;
      let offset = 0;
      if (rect.bottom > window.innerHeight) {
        offset = window.innerHeight - rect.bottom - 8;
      } else if (rect.top < 0) {
        offset = -rect.top + 8;
      }
      setSubmenuOffset(offset);
    }, [subIndex, submenuDir]);

    return (
      <div className="cursor-default w-52 rounded-md border border-gray-700 context-menu-bg text-left text-white shadow-lg">
        <ul className="py-2">
          {items.map((item, i) =>
            item.separator ? (
              <li key={i} role="separator" className="mx-2 my-1 border-t border-gray-700" />
            ) : (
              <li
                key={i}
                className="relative"
                onMouseEnter={(e) => {
                  if (item.submenu) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setSubmenuDir(
                      window.innerWidth - rect.right < SUBMENU_WIDTH ? 'left' : 'right',
                    );
                    setSubIndex(i);
                  }
                }}
                onMouseLeave={() => setSubIndex((prev) => (prev === i ? null : prev))}
              >
                <button
                  role="menuitem"
                  tabIndex={-1}
                  className="flex w-full items-center justify-between rounded-sm px-4 py-1 text-left hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
                  onClick={(e) => {
                    if (item.submenu) {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setSubmenuDir(
                        window.innerWidth - rect.right < SUBMENU_WIDTH ? 'left' : 'right',
                      );
                      setSubIndex(i);
                    } else {
                      item.onSelect?.();
                      close();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' && item.submenu) {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setSubmenuDir(
                        window.innerWidth - rect.right < SUBMENU_WIDTH ? 'left' : 'right',
                      );
                      setSubIndex(i);
                    }
                    if (e.key === 'ArrowLeft') setSubIndex(null);
                  }}
                >
                  {item.label}
                  {item.submenu && (
                    <span className="ml-2">
                      {subIndex === i && submenuDir === 'left' ? '◀' : '▶'}
                    </span>
                  )}
                </button>
                {item.submenu && subIndex === i && (
                  <div
                    ref={submenuRef}
                    className={`absolute top-0 ${
                      submenuDir === 'right' ? 'left-full ml-1' : 'right-full mr-1'
                    }`}
                    style={{ top: submenuOffset }}
                  >
                    <MenuPanel items={item.submenu} />
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      </div>
    );
  };

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

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 8;
    let x = pos.x;
    let y = pos.y;
    if (rect.right > window.innerWidth)
      x = Math.max(padding, window.innerWidth - rect.width - padding);
    if (rect.bottom > window.innerHeight)
      y = Math.max(padding, window.innerHeight - rect.height - padding);
    if (rect.left < padding) x = padding;
    if (rect.top < padding) y = padding;
    if (x !== pos.x || y !== pos.y) setPos({ x, y });
  }, [open, pos]);

  return (
    <div
      role="menu"
      ref={menuRef}
      aria-hidden={!open}
      {...(ariaLabelledBy
        ? { 'aria-labelledby': ariaLabelledBy }
        : { 'aria-label': ariaLabel })}
      style={{ left: pos.x, top: pos.y }}
      className={(open ? 'block ' : 'hidden ') + 'absolute z-50'}
    >
      <MenuPanel items={items} />
    </div>
  );
};

export default ContextMenu;

