import React, { useCallback, useEffect, useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';

export interface MenuItem {
  label: React.ReactNode;
  onSelect: () => void;
  /** Marks the item as unavailable. Disabled items are skipped during keyboard navigation. */
  disabled?: boolean;
  /** Optional callback to trigger when the user requests to open a submenu via keyboard */
  onOpenSubmenu?: () => void;
  /** Optional callback to trigger when the user requests to close a submenu via keyboard */
  onCloseSubmenu?: () => void;
}

interface ContextMenuProps {
  /** Element that triggers this context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Menu items to render */
  items: MenuItem[];
  /** Optional callback fired when the menu closes */
  onClose?: () => void;
}

/**
 * Accessible context menu that supports right click and Shift+F10
 * activation. It manages a roving focus index for keyboard navigation
 * and dispatches global events when opened/closed so backgrounds can
 * be made inert.
 */
const ContextMenu: React.FC<ContextMenuProps> = ({ targetRef, items, onClose }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, open);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
    onClose?.();

    const target = targetRef.current;
    if (target) {
      try {
        target.focus({ preventScroll: true });
      } catch (error) {
        // Some elements such as SVG nodes may throw if focus is attempted.
        // Ignore the error silently because focus restoration is a best-effort enhancement.
      }
    }
  }, [onClose, targetRef]);

  const focusItem = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return;
      setFocusedIndex(index);
      requestAnimationFrame(() => {
        itemRefs.current[index]?.focus();
      });
    },
    [items.length],
  );

  const findNextEnabled = useCallback(
    (startIndex: number, direction: 1 | -1) => {
      if (items.length === 0) return -1;
      let index = startIndex;
      for (let attempt = 0; attempt < items.length; attempt += 1) {
        index = (index + direction + items.length) % items.length;
        if (!items[index]?.disabled) {
          return index;
        }
      }
      return -1;
    },
    [items],
  );

  const handleItemKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number, item: MenuItem) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const next = findNextEnabled(index, 1);
          if (next !== -1) {
            focusItem(next);
          }
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prev = findNextEnabled(index, -1);
          if (prev !== -1) {
            focusItem(prev);
          }
          break;
        }
        case 'ArrowRight': {
          if (item.onOpenSubmenu) {
            event.preventDefault();
            item.onOpenSubmenu();
          }
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          if (item.onCloseSubmenu) {
            item.onCloseSubmenu();
          } else {
            closeMenu();
          }
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (!item.disabled) {
            item.onSelect();
            closeMenu();
          }
          break;
        }
        default:
          break;
      }
    },
    [closeMenu, findNextEnabled, focusItem],
  );

  const handleSelect = useCallback(
    (item: MenuItem) => {
      if (item.disabled) return;
      item.onSelect();
      closeMenu();
    },
    [closeMenu],
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
    if (!open) {
      setFocusedIndex(-1);
      return;
    }
    const firstEnabled = items.findIndex((item) => !item.disabled);
    if (firstEnabled !== -1) {
      focusItem(firstEnabled);
    }
  }, [focusItem, items, open]);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeMenu, open]);

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
          tabIndex={focusedIndex === i ? 0 : -1}
          ref={(element) => {
            itemRefs.current[i] = element;
          }}
          onFocus={() => setFocusedIndex(i)}
          onKeyDown={(event) => handleItemKeyDown(event, i, item)}
          onClick={() => handleSelect(item)}
          aria-disabled={item.disabled || undefined}
          className="w-full cursor-default py-0.5 text-left hover:bg-gray-700 mb-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={item.disabled}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;

