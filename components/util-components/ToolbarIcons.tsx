import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';

export interface ToolbarIconItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  isActive?: boolean;
  isFocused?: boolean;
  showLabel?: boolean;
}

interface ToolbarIconsProps {
  items: ToolbarIconItem[];
  gap?: string;
  className?: string;
  moreButtonLabel?: string;
  menuAriaLabel?: string;
}

type ButtonVariant = 'visible' | 'measurement';

const DEFAULT_MORE_BUTTON_WIDTH = 48;

function MoreIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
    >
      <circle cx="12" cy="5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
    </svg>
  );
}

const ToolbarIcons: React.FC<ToolbarIconsProps> = ({
  items,
  gap = 'var(--shell-taskbar-gap, 0.5rem)',
  className,
  moreButtonLabel = 'More',
  menuAriaLabel = 'Overflow toolbar items',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measurementRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const measurementMoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState<number>(items.length);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setVisibleCount((previous) => Math.min(previous, items.length));
    setMenuOpen(false);
  }, [items.length]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(container.clientWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const hasOverflow = useMemo(() => items.length > visibleCount, [items.length, visibleCount]);

  useEffect(() => {
    if (!hasOverflow && menuOpen) {
      setMenuOpen(false);
    }
  }, [hasOverflow, menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const menuElement = menuRef.current;
      const buttonElement = moreButtonRef.current;
      const target = event.target as Node;
      if (
        menuElement &&
        buttonElement &&
        !menuElement.contains(target) &&
        !buttonElement.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const renderToolbarButton = useCallback(
    (item: ToolbarIconItem, variant: ButtonVariant) => {
      const {
        buttonProps,
        icon,
        label,
        onClick,
        isActive,
        isFocused,
        showLabel = true,
      } = item;

      const {
        className: customClassName,
        style: customStyle,
        onClick: customOnClick,
        id,
        ...restButtonProps
      } = buttonProps ?? {};

      const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (customOnClick) {
          customOnClick(event);
        }
        if (onClick) {
          onClick(event);
        }
      };

      const mergedStyle: React.CSSProperties = {
        minHeight: 'var(--shell-hit-target, 2.5rem)',
        minWidth: 'var(--shell-hit-target, 2.5rem)',
        paddingInline: 'calc(var(--shell-taskbar-padding-x, 0.75rem) * 0.75)',
        fontSize: 'var(--shell-taskbar-font-size, 0.875rem)',
        gap: '0.5rem',
        ...customStyle,
      };

      const mergedClassName = clsx(
        'relative flex flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        isFocused && isActive ? 'bg-white bg-opacity-20' : undefined,
        customClassName,
      );

      const commonProps: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown> = {
        type: 'button',
        className: mergedClassName,
        style: mergedStyle,
        ...restButtonProps,
      };

      if (variant !== 'measurement') {
        commonProps.onClick = handleClick;
        if (id !== undefined) {
          commonProps.id = id;
        }
        if (commonProps['aria-pressed'] === undefined && typeof isActive === 'boolean') {
          commonProps['aria-pressed'] = isActive;
        }
      } else {
        commonProps.onClick = undefined;
        commonProps.tabIndex = -1;
        commonProps['aria-hidden'] = true;
        if (commonProps.id) {
          delete commonProps.id;
        }
      }

      if (commonProps['aria-label'] === undefined) {
        commonProps['aria-label'] = label;
      }

      if (commonProps['data-active'] === undefined) {
        commonProps['data-active'] = isActive ? 'true' : 'false';
      }

      return (
        <button key={item.id} {...commonProps}>
          <span
            aria-hidden="true"
            className="flex items-center justify-center"
            style={{
              width: 'var(--shell-taskbar-icon, 1.5rem)',
              height: 'var(--shell-taskbar-icon, 1.5rem)',
            }}
          >
            {icon}
          </span>
          {showLabel && (
            <span
              className="text-white whitespace-nowrap"
              style={{ fontSize: 'var(--shell-taskbar-font-size, 0.875rem)' }}
            >
              {label}
            </span>
          )}
          {isActive && variant !== 'measurement' && (
            <span
              aria-hidden="true"
              data-testid="running-indicator"
              className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded"
              style={{
                width: '0.5rem',
                height: '0.25rem',
                background: 'currentColor',
              }}
            />
          )}
        </button>
      );
    },
    [],
  );

  const measureVisibleCount = useCallback(() => {
    const container = containerRef.current;
    const measurement = measurementRef.current;
    if (!container || !measurement) {
      return;
    }

    const availableWidth = containerWidth || container.clientWidth;
    if (!availableWidth) {
      return;
    }

    const children = Array.from(measurement.children) as HTMLElement[];
    if (!children.length) {
      if (visibleCount !== 0) {
        setVisibleCount(0);
      }
      return;
    }

    const computedStyle = getComputedStyle(measurement);
    const gapValue = Number.parseFloat(computedStyle.columnGap || computedStyle.gap || '0');

    const measuredMoreButton = measurementMoreButtonRef.current ?? moreButtonRef.current;
    const moreButtonWidth = measuredMoreButton?.offsetWidth ?? DEFAULT_MORE_BUTTON_WIDTH;

    let nextVisible = children.length;
    let totalWidth = 0;

    for (let index = 0; index < children.length; index += 1) {
      const childWidth = children[index].offsetWidth;
      if (index > 0) {
        totalWidth += gapValue;
      }

      const potentialTotal = totalWidth + childWidth;
      const hasRemaining = index < children.length - 1;
      const reserveForMore = hasRemaining
        ? moreButtonWidth + (index >= 0 ? gapValue : 0)
        : 0;

      if (potentialTotal + reserveForMore > availableWidth) {
        nextVisible = index;
        break;
      }

      totalWidth = potentialTotal;
    }

    if (nextVisible !== visibleCount) {
      setVisibleCount(nextVisible);
    }
  }, [containerWidth, visibleCount]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      measureVisibleCount();
    });

    return () => cancelAnimationFrame(frame);
  }, [measureVisibleCount, items, containerWidth]);

  const visibleItems = useMemo(
    () => items.slice(0, Math.min(visibleCount, items.length)),
    [items, visibleCount],
  );

  const overflowItems = useMemo(
    () => items.slice(Math.min(visibleCount, items.length)),
    [items, visibleCount],
  );

  const handleMenuItemClick = useCallback(
    (item: ToolbarIconItem) => (event: React.MouseEvent<HTMLButtonElement>) => {
      if (item.buttonProps?.onClick) {
        item.buttonProps.onClick(event);
      }
      if (item.onClick) {
        item.onClick(event);
      }
      setMenuOpen(false);
    },
    [],
  );

  const renderMoreButton = useCallback(
    (variant: ButtonVariant) => {
      const commonProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
        type: 'button',
        className:
          'relative flex flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        style: {
          minHeight: 'var(--shell-hit-target, 2.5rem)',
          minWidth: 'var(--shell-hit-target, 2.5rem)',
          paddingInline: 'calc(var(--shell-taskbar-padding-x, 0.75rem) * 0.5)',
        },
        'aria-label': moreButtonLabel,
      };

      if (variant === 'measurement') {
        commonProps.tabIndex = -1;
        commonProps['aria-hidden'] = true;
      } else {
        commonProps.onClick = () => {
          setMenuOpen((open) => !open);
        };
        commonProps['aria-haspopup'] = 'menu';
        commonProps['aria-expanded'] = menuOpen;
      }

      const ref = variant === 'measurement' ? measurementMoreButtonRef : moreButtonRef;

      return (
        <button ref={ref} {...commonProps}>
          <span
            aria-hidden="true"
            className="flex items-center justify-center"
            style={{
              width: 'var(--shell-taskbar-icon, 1.5rem)',
              height: 'var(--shell-taskbar-icon, 1.5rem)',
            }}
          >
            <MoreIcon />
          </span>
        </button>
      );
    },
    [menuOpen, moreButtonLabel],
  );

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={clsx(
          'flex min-w-0 items-center overflow-hidden',
          'flex-nowrap',
          className,
        )}
        style={{ columnGap: gap }}
      >
        {visibleItems.map((item) => renderToolbarButton(item, 'visible'))}
        {overflowItems.length > 0 && (
          <div className="relative flex-shrink-0">
            {renderMoreButton('visible')}
            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                aria-label={menuAriaLabel}
                className="absolute bottom-full right-0 mb-2 w-56 rounded-md border border-white/10 bg-black/85 p-2 text-sm shadow-lg backdrop-blur"
              >
                <div className="flex flex-col gap-1">
                  {overflowItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      onClick={handleMenuItemClick(item)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <span
                        aria-hidden="true"
                        className="flex items-center justify-center"
                        style={{
                          width: 'var(--shell-taskbar-icon, 1.5rem)',
                          height: 'var(--shell-taskbar-icon, 1.5rem)',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div
        aria-hidden="true"
        ref={measurementRef}
        className="pointer-events-none absolute inset-0 -z-50 flex flex-nowrap opacity-0"
        style={{ columnGap: gap }}
      >
        {items.map((item) => (
          <div key={`${item.id}-measurement`} className="flex-shrink-0">
            {renderToolbarButton(item, 'measurement')}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 -z-50 opacity-0">
        {renderMoreButton('measurement')}
      </div>
    </div>
  );
};

export default ToolbarIcons;
