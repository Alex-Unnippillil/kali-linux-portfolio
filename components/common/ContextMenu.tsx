import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

type MenuSeparator = {
  type: 'separator';
  id?: string;
  label?: React.ReactNode;
};

type MenuAction = {
  type?: 'item';
  id?: string;
  label: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  shortcut?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  danger?: boolean;
};

export type MenuItem = MenuAction | MenuSeparator;

interface ContextMenuProps {
  /** Element that triggers this context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Menu items to render */
  items: Array<MenuItem | null | false | undefined>;
  /**
   * Optional callback fired before menu opens. Return `false` to cancel.
   * Useful for updating selection state based on the right-click target.
   */
  onOpen?: (event: MouseEvent) => boolean | void;
  /** Optional callback fired when the menu closes. */
  onClose?: () => void;
  /** Additional class names applied to the menu container. */
  className?: string;
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
  onOpen,
  onClose,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const wasOpenRef = useRef(false);

  const visibleItems = useMemo(() => {
    const normalized = (items || []).filter(
      (item): item is MenuItem => Boolean(item),
    );

    const cleaned: MenuItem[] = [];
    let lastWasSeparator = true;

    normalized.forEach((item) => {
      if (item.type === 'separator') {
        if (lastWasSeparator) {
          return;
        }
        lastWasSeparator = true;
        cleaned.push(item);
      } else {
        cleaned.push(item);
        lastWasSeparator = false;
      }
    });

    while (cleaned[cleaned.length - 1]?.type === 'separator') {
      cleaned.pop();
    }

    return cleaned;
  }, [items]);

  const hasItems = visibleItems.length > 0;

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, open);
  useRovingTabIndex(
    menuRef as React.RefObject<HTMLElement>,
    open,
    'vertical',
  );

  const triggerOpen = useCallback(
    (event: MouseEvent, fallbackPosition?: { x: number; y: number }) => {
      const shouldOpen = onOpen?.(event);
      if (shouldOpen === false) {
        return;
      }
      if (!hasItems) {
        return;
      }

      const nextPos = {
        x: fallbackPosition?.x ?? event.pageX,
        y: fallbackPosition?.y ?? event.pageY,
      };
      setPos(nextPos);
      setOpen(true);
    },
    [hasItems, onOpen],
  );

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerOpen(e);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F10') {
        e.preventDefault();
        const rect = node.getBoundingClientRect();
        const synthetic = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left,
          clientY: rect.bottom,
        });
        try {
          Object.defineProperty(synthetic, 'target', {
            configurable: true,
            enumerable: true,
            value: node,
          });
          Object.defineProperty(synthetic, 'currentTarget', {
            configurable: true,
            enumerable: true,
            value: node,
          });
        } catch {
          /* noop */
        }
        triggerOpen(synthetic, {
          x: rect.left + window.scrollX,
          y: rect.bottom + window.scrollY,
        });
      }
    };

    node.addEventListener('contextmenu', handleContextMenu);
    node.addEventListener('keydown', handleKeyDown);

    return () => {
      node.removeEventListener('contextmenu', handleContextMenu);
      node.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetRef, triggerOpen]);

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
    if (wasOpenRef.current && !open) {
      onClose?.();
    }
    wasOpenRef.current = open;
  }, [open, onClose]);

  return (
    <div
      role="menu"
      ref={menuRef}
      aria-hidden={!open}
      style={{ left: pos.x, top: pos.y }}
      className={(open ? 'block ' : 'hidden ') +
        'cursor-default w-60 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm ' +
        (className ?? '')}
    >
      {visibleItems.map((item, i) => {
        if (item.type === 'separator') {
          return (
            <div key={item.id ?? `sep-${i}`} className="py-1" role="separator">
              {item.label ? (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {item.label}
                </div>
              ) : null}
              <div className="mx-3 border-t border-gray-800" />
            </div>
          );
        }

        const {
          id,
          label,
          onSelect,
          disabled,
          shortcut,
          icon,
          ariaLabel,
          danger,
        } = item;

        return (
          <button
            key={id ?? `item-${i}`}
            role="menuitem"
            tabIndex={-1}
            type="button"
            aria-label={ariaLabel}
            onClick={() => {
              if (disabled) return;
              onSelect();
              setOpen(false);
            }}
            disabled={disabled}
            className={`w-full text-left cursor-default py-1 px-3 flex items-center justify-between gap-4 rounded-sm
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 focus:bg-gray-700'}
              ${danger ? 'text-red-300' : ''}`}
          >
            <span className="flex items-center gap-2">
              {icon ? <span className="text-base">{icon}</span> : null}
              <span>{label}</span>
            </span>
            {shortcut ? (
              <span className="text-xs text-gray-400 tracking-widest">{shortcut}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;

