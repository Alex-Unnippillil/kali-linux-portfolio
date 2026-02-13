import React, { useState, useRef, useEffect, useCallback } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import { getSafeAreaInsets } from '../../utils/windowLayout';

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
type PointerAnchor = {
  type: 'pointer';
  pageX: number;
  pageY: number;
};

type ElementAnchor = {
  type: 'element';
};

type Anchor = PointerAnchor | ElementAnchor;

const ContextMenu: React.FC<ContextMenuProps> = ({ targetRef, items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [anchor, setAnchor] = useState<Anchor | null>(null);
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
      const pointerAnchor: PointerAnchor = {
        type: 'pointer',
        pageX: e.pageX,
        pageY: e.pageY,
      };
      setAnchor(pointerAnchor);
      setPos({ x: pointerAnchor.pageX, y: pointerAnchor.pageY });
      setOpen(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F10') {
        e.preventDefault();
        const rect = node.getBoundingClientRect();
        const baseLeft =
          (typeof window !== 'undefined' ? window.scrollX : 0) + rect.left;
        const baseTop =
          (typeof window !== 'undefined' ? window.scrollY : 0) + rect.bottom;
        setAnchor({ type: 'element' });
        setPos({ x: baseLeft, y: baseTop });
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

  const updatePosition = useCallback(() => {
    if (!anchor || typeof window === 'undefined') {
      return;
    }

    const menuEl = menuRef.current;
    const safeInsets = getSafeAreaInsets();
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = 0;
    let top = 0;

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    const menuWidth = menuEl?.offsetWidth ?? 0;
    const menuHeight = menuEl?.offsetHeight ?? 0;

    const minLeft = scrollX + safeInsets.left;
    const minTop = scrollY + safeInsets.top;
    const maxLeft = Math.max(
      minLeft,
      scrollX + viewportWidth - safeInsets.right - menuWidth,
    );
    const maxTop = Math.max(
      minTop,
      scrollY + viewportHeight - safeInsets.bottom - menuHeight,
    );

    const ensureAnchorBase = () => {
      if (anchor.type === 'pointer') {
        left = anchor.pageX;
        top = anchor.pageY;
        return;
      }

      const target = targetRef.current;
      if (!target) {
        return;
      }
      const rect = target.getBoundingClientRect();
      left = scrollX + rect.left;
      top = scrollY + rect.bottom;
    };

    ensureAnchorBase();

    if (menuWidth > 0) {
      const viewportRightEdge = scrollX + viewportWidth - safeInsets.right;
      if (left + menuWidth > viewportRightEdge) {
        let flippedLeft = left;
        if (anchor.type === 'pointer') {
          flippedLeft = anchor.pageX - menuWidth;
        } else {
          const target = targetRef.current;
          if (target) {
            const rect = target.getBoundingClientRect();
            flippedLeft = scrollX + rect.right - menuWidth;
          }
        }
        left = clamp(flippedLeft, minLeft, maxLeft);
      }
    }

    left = clamp(left, minLeft, maxLeft);

    if (menuHeight > 0) {
      const viewportBottomEdge = scrollY + viewportHeight - safeInsets.bottom;
      if (top + menuHeight > viewportBottomEdge) {
        let flippedTop = top;
        if (anchor.type === 'pointer') {
          flippedTop = anchor.pageY - menuHeight;
        } else {
          const target = targetRef.current;
          if (target) {
            const rect = target.getBoundingClientRect();
            flippedTop = scrollY + rect.top - menuHeight;
          }
        }
        top = clamp(flippedTop, minTop, maxTop);
      }
    }

    top = clamp(top, minTop, maxTop);

    setPos((prev) => {
      if (prev.x === left && prev.y === top) {
        return prev;
      }
      return { x: left, y: top };
    });
  }, [anchor, targetRef]);

  useEffect(() => {
    if (!open) return;

    const raf = window.requestAnimationFrame(() => {
      updatePosition();
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleWindowChange = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    handleWindowChange();

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      setAnchor(null);
    }
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

