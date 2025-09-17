import React, { useEffect, useId, useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

export interface MenuItem {
  label: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
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
const EDGE_INSET = 12;

const ContextMenu: React.FC<ContextMenuProps> = ({ targetRef, items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const itemCount = items.length;

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, open);
  useRovingTabIndex(menuRef as React.RefObject<HTMLElement>, open, 'vertical');

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const previousHasPopup = node.getAttribute('aria-haspopup');
    const previousControls = node.getAttribute('aria-controls');
    const previousExpanded = node.getAttribute('aria-expanded');

    node.setAttribute('aria-haspopup', 'menu');
    node.setAttribute('aria-controls', menuId);

    return () => {
      if (previousHasPopup !== null) {
        node.setAttribute('aria-haspopup', previousHasPopup);
      } else {
        node.removeAttribute('aria-haspopup');
      }

      if (previousControls !== null) {
        node.setAttribute('aria-controls', previousControls);
      } else {
        node.removeAttribute('aria-controls');
      }

      if (previousExpanded !== null) {
        node.setAttribute('aria-expanded', previousExpanded);
      } else {
        node.removeAttribute('aria-expanded');
      }
    };
  }, [targetRef, menuId]);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    node.setAttribute('aria-expanded', open ? 'true' : 'false');
  }, [targetRef, open]);

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

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const overflowX = Math.max(0, rect.right + EDGE_INSET - window.innerWidth);
    const overflowY = Math.max(0, rect.bottom + EDGE_INSET - window.innerHeight);

    if (overflowX > 0 || overflowY > 0) {
      setPos((current) => ({
        x: Math.max(EDGE_INSET, current.x - overflowX),
        y: Math.max(EDGE_INSET, current.y - overflowY),
      }));
    }
  }, [open, itemCount]);

  useEffect(() => {
    if (!open) return;

    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [open, itemCount]);

  return (
    <div
      id={menuId}
      role="menu"
      ref={menuRef}
      aria-hidden={!open}
      data-open={open ? 'true' : 'false'}
      style={{ left: pos.x, top: pos.y }}
      className="context-menu"
    >
      {items.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          type="button"
          tabIndex={-1}
          aria-disabled={item.disabled ? 'true' : undefined}
          disabled={item.disabled}
          onClick={() => {
            if (item.disabled) return;
            item.onSelect();
            setOpen(false);
          }}
          className="context-menu__item"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;

