"use client";

import clsx from "clsx";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

const LONG_PRESS_DELAY = 450;
const MENU_WIDTH = 208;
const MENU_MARGIN = 8;
const MENU_ITEM_HEIGHT = 44;

type VoidOrPromise = void | Promise<void>;

export interface ToolbarAction {
  /** Unique identifier used for React keys */
  id?: string;
  /** Visible label rendered inside the context menu. */
  label: string;
  /** Optional leading icon rendered before the label. */
  icon?: React.ReactNode;
  /** Whether the action is disabled. */
  disabled?: boolean;
  /** Invoked when the action is selected. */
  onSelect: () => VoidOrPromise;
}

export interface ToolbarIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Source path for the toolbar icon image. */
  iconSrc: string;
  /** Accessible alternative text for the toolbar icon image. */
  iconAlt: string;
  /** Text used for accessibility fallbacks and tooltips. */
  label: string;
  /** Optional size for the toolbar icon image. Defaults to 16px. */
  iconSize?: number;
  /** Optional context menu title rendered above the actions list. */
  menuLabel?: string;
  /** Actions surfaced when long-pressing or right-clicking the icon. */
  secondaryActions?: ToolbarAction[];
  /** Optional width for the generated context menu. */
  menuWidth?: number;
}

const getDocumentBody = () =>
  typeof document === "undefined" ? null : document.body;

export const ToolbarIconButton = forwardRef<
  HTMLButtonElement,
  ToolbarIconButtonProps
>(function ToolbarIconButton(
  {
    iconSrc,
    iconAlt,
    label,
    iconSize = 16,
    className = "",
    secondaryActions = [],
    menuLabel,
    menuWidth = MENU_WIDTH,
    onClick,
    onKeyDown,
    onContextMenu,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    ...rest
  },
  forwardedRef,
) {
  const internalRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  const hasSecondaryActions = secondaryActions.length > 0;

  const setButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      internalRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const closeMenu = useCallback(() => {
    setMenuPosition(null);
    longPressTriggered.current = false;
  }, []);

  const computeMenuPosition = useCallback(
    (point?: { x: number; y: number }) => {
      let referenceX = point?.x;
      let referenceY = point?.y;

      if ((referenceX === undefined || referenceY === undefined) && internalRef.current) {
        const rect = internalRef.current.getBoundingClientRect();
        referenceX = rect.left + rect.width / 2;
        referenceY = rect.bottom + MENU_MARGIN;
      }

      if (referenceX === undefined || referenceY === undefined) {
        return { left: MENU_MARGIN, top: MENU_MARGIN };
      }

      if (typeof window === "undefined") {
        return { left: referenceX, top: referenceY };
      }

      const headerAllowance = menuLabel ? 48 : 32;
      const menuHeight = secondaryActions.length * MENU_ITEM_HEIGHT + headerAllowance;
      const { innerWidth, innerHeight } = window;

      const minLeft = MENU_MARGIN;
      const maxLeft = Math.max(minLeft, innerWidth - menuWidth - MENU_MARGIN);
      const minTop = MENU_MARGIN;
      const maxTop = Math.max(minTop, innerHeight - menuHeight - MENU_MARGIN);

      const adjustedLeft = Math.min(Math.max(referenceX - menuWidth / 2, minLeft), maxLeft);
      const adjustedTop = Math.min(Math.max(referenceY, minTop), maxTop);

      return { left: adjustedLeft, top: adjustedTop };
    },
    [menuLabel, menuWidth, secondaryActions.length],
  );

  const openMenu = useCallback(
    (point?: { x: number; y: number }) => {
      if (!hasSecondaryActions) return;
      clearLongPressTimer();
      longPressTriggered.current = true;
      setMenuPosition(computeMenuPosition(point));
    },
    [clearLongPressTimer, computeMenuPosition, hasSecondaryActions],
  );

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  useEffect(() => {
    if (!hasSecondaryActions && menuPosition) {
      closeMenu();
    }
  }, [closeMenu, hasSecondaryActions, menuPosition]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(event);
      if (!hasSecondaryActions || event.button !== 0) {
        return;
      }

      const { clientX, clientY } = event;
      pointerPositionRef.current = { x: clientX, y: clientY };
      clearLongPressTimer();
      longPressTriggered.current = false;
      longPressTimer.current = window.setTimeout(() => {
        openMenu(pointerPositionRef.current ?? undefined);
      }, LONG_PRESS_DELAY);
    },
    [clearLongPressTimer, hasSecondaryActions, onPointerDown, openMenu],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      clearLongPressTimer();
      pointerPositionRef.current = null;
      onPointerUp?.(event);
    },
    [clearLongPressTimer, onPointerUp],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      clearLongPressTimer();
      pointerPositionRef.current = null;
      onPointerLeave?.(event);
    },
    [clearLongPressTimer, onPointerLeave],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      clearLongPressTimer();
      pointerPositionRef.current = null;
      onPointerCancel?.(event);
    },
    [clearLongPressTimer, onPointerCancel],
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      onContextMenu?.(event);
      if (!hasSecondaryActions) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openMenu({ x: event.clientX, y: event.clientY });
    },
    [hasSecondaryActions, onContextMenu, openMenu],
  );

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (longPressTriggered.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClick?.(event);
    },
    [onClick],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !hasSecondaryActions) {
        return;
      }
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        openMenu();
      }
    },
    [hasSecondaryActions, onKeyDown, openMenu],
  );

  const menuOpen = menuPosition !== null;

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (menuRef.current && menuRef.current.contains(event.target as Node)) {
        return;
      }
      if (internalRef.current && internalRef.current.contains(event.target as Node)) {
        return;
      }
      closeMenu();
    };

    const handleKeyDownOutside = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDownOutside);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDownOutside);
    };
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    if (typeof window === "undefined") return;

    const handleWindowChange = () => closeMenu();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);
    window.addEventListener("blur", handleWindowChange);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
      window.removeEventListener("blur", handleWindowChange);
    };
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    if (typeof window === "undefined") return;

    const id = window.requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector<HTMLButtonElement>(
        'button[role="menuitem"]',
      );
      firstItem?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(id);
  }, [menuOpen]);

  const restButtonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  const { ["aria-label"]: ariaLabelProp, title: titleProp, ...restWithoutLabels } =
    restButtonProps;

  const accessibleLabel = ariaLabelProp ?? label;
  const title = titleProp ?? label;
  const portalTarget = getDocumentBody();

  return (
    <>
      <button
        {...restWithoutLabels}
        ref={setButtonRef}
        type="button"
        title={title}
        aria-label={accessibleLabel}
        aria-haspopup={hasSecondaryActions || undefined}
        aria-expanded={hasSecondaryActions ? menuOpen : undefined}
        data-toolbar-context-open={menuOpen ? "true" : undefined}
        className={clsx(
          "relative flex h-6 w-6 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue",
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
      >
        <ToolbarIconImage
          src={iconSrc}
          alt={iconAlt}
          size={iconSize}
          className="h-4 w-4"
        />
      </button>
      {menuOpen && menuPosition && portalTarget
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={menuLabel ?? `${label} actions`}
              className="fixed z-[60] w-52 rounded-md border border-black/40 bg-ub-cool-grey/95 text-left text-white shadow-lg backdrop-blur"
              style={{ left: menuPosition.left, top: menuPosition.top }}
              onContextMenu={(event) => event.preventDefault()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {menuLabel && (
                <div className="border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200">
                  {menuLabel}
                </div>
              )}
              <div className="py-1">
                {secondaryActions.map((action, index) => {
                  const key = action.id ?? `${index}`;
                  const isDisabled = Boolean(action.disabled);
                  return (
                    <button
                      key={key}
                      type="button"
                      role="menuitem"
                      className={clsx(
                        "flex h-11 w-full items-center gap-3 px-4 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue",
                        isDisabled
                          ? "cursor-not-allowed text-gray-400"
                          : "text-white hover:bg-white/10",
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isDisabled) return;
                        action.onSelect();
                        closeMenu();
                      }}
                      disabled={isDisabled}
                    >
                      {action.icon && (
                        <span
                          aria-hidden="true"
                          className="flex h-6 w-6 items-center justify-center text-base"
                        >
                          {action.icon}
                        </span>
                      )}
                      <span className="flex-1 truncate">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
});

ToolbarIconButton.displayName = "ToolbarIconButton";

interface ToolbarIconImageProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

const ToolbarIconImage: React.FC<ToolbarIconImageProps> = ({
  src,
  alt,
  size = 16,
  className = "h-4 w-4",
}) => (
  <Image
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={className}
    draggable={false}
    sizes={`${size}px`}
  />
);

export const CloseIcon: React.FC<Omit<ToolbarIconImageProps, "src" | "alt">> = (
  props,
) => <ToolbarIconImage src="/themes/Yaru/window/window-close-symbolic.svg" alt="Close" {...props} />;

export const MinimizeIcon: React.FC<Omit<ToolbarIconImageProps, "src" | "alt">> = (
  props,
) => (
  <ToolbarIconImage
    src="/themes/Yaru/window/window-minimize-symbolic.svg"
    alt="Minimize"
    {...props}
  />
);

export const MaximizeIcon: React.FC<Omit<ToolbarIconImageProps, "src" | "alt">> = (
  props,
) => (
  <ToolbarIconImage
    src="/themes/Yaru/window/window-maximize-symbolic.svg"
    alt="Maximize"
    {...props}
  />
);

export const RestoreIcon: React.FC<Omit<ToolbarIconImageProps, "src" | "alt">> = (
  props,
) => (
  <ToolbarIconImage
    src="/themes/Yaru/window/window-restore-symbolic.svg"
    alt="Restore"
    {...props}
  />
);

export const PinIcon: React.FC<Omit<ToolbarIconImageProps, "src" | "alt">> = (props) => (
  <ToolbarIconImage
    src="/themes/Yaru/window/window-pin-symbolic.svg"
    alt="Pin"
    {...props}
  />
);

export const WINDOW_TOOLBAR_ICONS = {
  close: "/themes/Yaru/window/window-close-symbolic.svg",
  minimize: "/themes/Yaru/window/window-minimize-symbolic.svg",
  maximize: "/themes/Yaru/window/window-maximize-symbolic.svg",
  restore: "/themes/Yaru/window/window-restore-symbolic.svg",
  pin: "/themes/Yaru/window/window-pin-symbolic.svg",
} as const;

export type ToolbarIconId = keyof typeof WINDOW_TOOLBAR_ICONS;

