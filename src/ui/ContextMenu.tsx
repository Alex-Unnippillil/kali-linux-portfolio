'use client';

import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const EDGE_GAP = 8;

type HorizontalPlacement = 'left' | 'right';
type VerticalPlacement = 'top' | 'bottom';

export interface ContextMenuItem {
  id?: string;
  label: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface ContextMenuProps {
  /** Items rendered inside the context menu. */
  items: ContextMenuItem[];
  /** Optional additional classes for the menu container. */
  className?: string;
  /** Optional DOM id applied to the menu container. */
  id?: string;
  /** Called whenever the menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Children are rendered as-is so the menu can live alongside other UI. */
  children?: ReactNode;
}

const ANCHOR_NAME = '--context-menu-anchor';

const ContextMenu = ({ items, className, id, onOpenChange, children }: ContextMenuProps) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [supportsAnchors, setSupportsAnchors] = useState(false);
  const [fallbackPos, setFallbackPos] = useState({ left: 0, top: 0 });
  const [horizontal, setHorizontal] = useState<HorizontalPlacement>('right');
  const [vertical, setVertical] = useState<VerticalPlacement>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
    }
  }, []);

  useEffect(() => {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
      setSupportsAnchors(false);
      return;
    }

    const anchorSupported =
      CSS.supports(`anchor-name: ${ANCHOR_NAME}`) &&
      CSS.supports(`position-anchor: ${ANCHOR_NAME}`);

    setSupportsAnchors(anchorSupported);
  }, []);

  useEffect(() => {
    if (!onOpenChange) return;
    onOpenChange(open);
  }, [open, onOpenChange]);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    const handleScroll = () => {
      closeMenu();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [closeMenu, open]);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (!items.length) {
        return;
      }

      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      event.preventDefault();

      const x = event.clientX;
      const y = event.clientY;
      setCoords({ x, y });
      setFallbackPos({ left: x, top: y });
      setOpen(true);
    },
    [items.length],
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleContextMenu]);

  useLayoutEffect(() => {
    if (!open) return;

    const menuEl = menuRef.current;
    if (!menuEl) return;

    const rect = menuEl.getBoundingClientRect();

    if (supportsAnchors) {
      const nextHorizontal: HorizontalPlacement =
        coords.x + rect.width > window.innerWidth - EDGE_GAP ? 'left' : 'right';
      const nextVertical: VerticalPlacement =
        coords.y + rect.height > window.innerHeight - EDGE_GAP ? 'top' : 'bottom';

      setHorizontal((prev) => (prev === nextHorizontal ? prev : nextHorizontal));
      setVertical((prev) => (prev === nextVertical ? prev : nextVertical));
    } else {
      let left = coords.x;
      let top = coords.y;

      if (left + rect.width > window.innerWidth - EDGE_GAP) {
        left = Math.max(window.innerWidth - rect.width - EDGE_GAP, EDGE_GAP);
      }

      if (top + rect.height > window.innerHeight - EDGE_GAP) {
        top = Math.max(window.innerHeight - rect.height - EDGE_GAP, EDGE_GAP);
      }

      setFallbackPos((prev) => {
        if (prev.left === left && prev.top === top) {
          return prev;
        }
        return { left, top };
      });
    }
  }, [coords, open, supportsAnchors]);

  if (!portalTarget) {
    return <>{children}</>;
  }

  const menuClassName = ['context-menu', 'rounded-md', 'bg-gray-900/95', 'text-white', 'shadow-lg', 'border', 'border-gray-800'];
  if (className) {
    menuClassName.push(className);
  }

  const menuStyle: CSSProperties = supportsAnchors
    ? {
        position: 'fixed',
        zIndex: 1000,
        inset: 'auto',
        ...({ ['positionAnchor' as any]: ANCHOR_NAME } as CSSProperties),
        top: vertical === 'bottom' ? 'anchor(bottom)' : 'anchor(top)',
        left: horizontal === 'right' ? 'anchor(right)' : 'anchor(left)',
        transformOrigin: `${horizontal === 'left' ? '100%' : '0%'} ${vertical === 'top' ? '100%' : '0%'}`,
        transform: `translate(${horizontal === 'left' ? '-100%' : '0'}, ${vertical === 'top' ? '-100%' : '0'})`,
      }
    : {
        position: 'fixed',
        left: `${fallbackPos.left}px`,
        top: `${fallbackPos.top}px`,
        zIndex: 1000,
      };

  const anchorStyle: CSSProperties | undefined = supportsAnchors
    ? {
        position: 'fixed',
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        ...({ ['anchorName' as any]: ANCHOR_NAME } as CSSProperties),
      }
    : undefined;

  return (
    <>
      {children}
      {open &&
        createPortal(
          <>
            {supportsAnchors && (
              <div className="context-menu-anchor" style={anchorStyle} />
            )}
            <div
              id={id}
              role="menu"
              aria-hidden={!open}
              ref={menuRef}
              data-open={open ? 'true' : 'false'}
              data-anchor-x={horizontal}
              data-anchor-y={vertical}
              className={menuClassName.join(' ')}
              style={menuStyle}
            >
              {items.map((item, index) => (
                <button
                  key={item.id ?? index}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onSelect?.();
                    closeMenu();
                  }}
                  className="block w-full cursor-default px-3 py-1.5 text-left text-sm hover:bg-gray-800 disabled:opacity-60 disabled:hover:bg-transparent"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>,
          portalTarget,
        )}
    </>
  );
};

export default ContextMenu;

