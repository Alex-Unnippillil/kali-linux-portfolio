import React, {
  CSSProperties,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

const CHECK_ROLES = new Set(['menuitemcheckbox', 'menuitemradio']);

export type ContextMenuTheme = 'system' | 'dark' | 'light';

interface ActionItem {
  id?: string;
  label: ReactNode;
  onSelect?: () => void;
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  checked?: boolean;
  role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
  shortcut?: ReactNode;
  keepOpen?: boolean;
  icon?: ReactNode;
}

interface SeparatorItem {
  type: 'separator';
  id?: string;
}

export type ContextMenuItemDefinition = ActionItem | SeparatorItem;

export interface ContextMenuProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  items: ContextMenuItemDefinition[];
  anchorPoint?: { x: number; y: number } | null;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  theme?: ContextMenuTheme;
  width?: number | string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  id,
  open,
  onClose,
  items,
  anchorPoint,
  ariaLabel,
  className,
  style,
  theme = 'system',
  width,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef(anchorPoint ?? null);
  const [position, setPosition] = useState<{ left: number; top: number }>(
    anchorPoint ? { left: anchorPoint.x, top: anchorPoint.y } : { left: 0, top: 0 }
  );

  useFocusTrap(menuRef, open);
  useRovingTabIndex(menuRef, open, 'vertical');

  useEffect(() => {
    if (!open) return;
    if (anchorPoint) {
      anchorRef.current = anchorPoint;
      setPosition({ left: anchorPoint.x, top: anchorPoint.y });
    } else if (anchorRef.current) {
      setPosition({ left: anchorRef.current.x, top: anchorRef.current.y });
    }
  }, [anchorPoint, open]);

  useLayoutEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    const node = menuRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const anchor = anchorRef.current ?? { x: 0, y: 0 };
    const margin = 8;
    let left = anchor.x;
    let top = anchor.y;

    if (left + rect.width > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (top + rect.height > window.innerHeight) {
      top = Math.max(margin, window.innerHeight - rect.height - margin);
    }

    setPosition((prev) =>
      prev.left === left && prev.top === top ? prev : { left, top }
    );
  }, [open, items.length, width]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      const focusable = menuRef.current?.querySelector<HTMLElement>(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'
      );
      focusable?.focus();
    });
    return () => {
      if (typeof window !== 'undefined') {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [open, items.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const eventName = open ? 'context-menu-open' : 'context-menu-close';
    window.dispatchEvent(new CustomEvent(eventName));
    if (open) {
      return () => {
        window.dispatchEvent(new CustomEvent('context-menu-close'));
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const resolvedWidth =
    width === undefined ? undefined : typeof width === 'number' ? `${width}px` : width;

  const classes = [
    'context-menu',
    'context-menu-bg',
    theme !== 'system' ? `context-menu--${theme}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const computedStyle: CSSProperties = {
    left: `${Math.round(position.left)}px`,
    top: `${Math.round(position.top)}px`,
    display: open ? 'block' : 'none',
    minWidth: resolvedWidth,
    ...style,
  };

  const renderItem = (item: ContextMenuItemDefinition, index: number) => {
    if ((item as SeparatorItem).type === 'separator') {
      const separator = item as SeparatorItem;
      return (
        <div
          key={separator.id ?? `separator-${index}`}
          className="context-menu__separator"
          role="separator"
        />
      );
    }

    const {
      id: itemId,
      label,
      onSelect,
      href,
      target,
      rel,
      disabled,
      checked,
      role,
      shortcut,
      keepOpen,
      icon,
    } = item as ActionItem;

    const itemRole = role ?? (checked !== undefined ? 'menuitemcheckbox' : 'menuitem');
    const isCheckable = CHECK_ROLES.has(itemRole);
    const isChecked = isCheckable ? Boolean(checked) : false;
    const key = itemId ?? `item-${index}`;

    const baseClass = [
      'context-menu__item',
      disabled ? 'context-menu__item--disabled' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const baseProps: React.HTMLAttributes<HTMLElement> = {
      id: itemId,
      role: itemRole,
      tabIndex: -1,
      'aria-disabled': disabled || undefined,
      'aria-checked': isCheckable ? isChecked : undefined,
      'data-checked': isChecked ? 'true' : undefined,
      className: baseClass,
      onMouseDown: (event) => event.stopPropagation(),
    };

    const content = (
      <>
        <span className="context-menu__check" aria-hidden="true">
          {isChecked ? '✓' : ''}
        </span>
        {icon ? (
          <span className="context-menu__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="context-menu__label">{label}</span>
        {shortcut ? (
          <span className="context-menu__shortcut">{shortcut}</span>
        ) : null}
      </>
    );

    const handleAction = (event: React.MouseEvent<HTMLElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onSelect?.();
      if (!keepOpen) {
        onClose();
      }
    };

    if (href && !disabled) {
      return (
        <a
          key={key}
          {...baseProps}
          href={href}
          target={target ?? '_blank'}
          rel={rel ?? 'noopener noreferrer'}
          onClick={handleAction}
        >
          {content}
        </a>
      );
    }

    if (disabled) {
      return (
        <div
          key={key}
          {...baseProps}
          data-roving-disabled="true"
        >
          {content}
        </div>
      );
    }

    return (
      <button
        key={key}
        type="button"
        {...baseProps}
        onClick={handleAction}
      >
        {content}
      </button>
    );
  };

  return (
    <div
      id={id}
      ref={menuRef}
      role="menu"
      aria-hidden={!open}
      aria-label={ariaLabel}
      className={classes}
      style={computedStyle}
      data-theme={theme}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
};

export default ContextMenu;
