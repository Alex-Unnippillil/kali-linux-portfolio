"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useFocusTrap from "@/hooks/useFocusTrap";
import useRovingTabIndex from "@/hooks/useRovingTabIndex";

interface DesktopOption {
  id: string;
  name: string;
}

interface TaskbarItemMenuProps {
  /** Element that should trigger the context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Identifier for the managed window */
  windowId: string;
  /** Application id used when spawning a new window */
  appId: string;
  /** Whether the taskbar item is currently pinned */
  isPinned: boolean;
  /** Available desktops/workspaces */
  desktops: DesktopOption[];
  /** Currently assigned desktop id */
  currentDesktopId?: string;
  /** Invoked to close the window */
  closeWindow: (windowId: string) => void;
  /** Invoked to pin the window to the taskbar */
  pinWindow: (windowId: string) => void;
  /** Invoked to unpin the window from the taskbar */
  unpinWindow: (windowId: string) => void;
  /** Invoked to move the window to a selected desktop */
  moveWindowToDesktop: (windowId: string, desktopId: string) => void;
  /** Invoked to create a new window for the application */
  openNewWindow: (appId: string) => void;
  /** Hide the "New Window" action when false */
  allowNewWindow?: boolean;
}

const MENU_CLASSES =
  "cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm shadow-lg";
const ITEM_CLASSES =
  "w-full text-left px-4 py-1.5 focus:outline-none focus:bg-gray-700 hover:bg-gray-700 cursor-default";

const TaskbarItemMenu: React.FC<TaskbarItemMenuProps> = ({
  targetRef,
  windowId,
  appId,
  isPinned,
  desktops,
  currentDesktopId,
  closeWindow,
  pinWindow,
  unpinWindow,
  moveWindowToDesktop,
  openNewWindow,
  allowNewWindow = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const moveButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenuTimeoutRef = useRef<number | null>(null);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [submenuOffset, setSubmenuOffset] = useState(0);

  useFocusTrap(containerRef as React.RefObject<HTMLElement>, open);
  useRovingTabIndex(menuListRef as React.RefObject<HTMLElement>, open, "vertical");
  useRovingTabIndex(
    submenuRef as React.RefObject<HTMLElement>,
    desktopMenuOpen,
    "vertical",
  );

  const clearDesktopMenuTimeout = useCallback(() => {
    if (closeMenuTimeoutRef.current !== null) {
      window.clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }
  }, []);

  const closeDesktopMenu = useCallback(
    (focusParent: boolean = false) => {
      clearDesktopMenuTimeout();
      setDesktopMenuOpen(false);
      if (focusParent) {
        moveButtonRef.current?.focus();
      }
    },
    [clearDesktopMenuTimeout],
  );

  const openDesktopMenu = useCallback(() => {
    if (!desktops.length) return;
    clearDesktopMenuTimeout();
    const trigger = moveButtonRef.current;
    if (trigger) {
      setSubmenuOffset(trigger.offsetTop);
    }
    setDesktopMenuOpen(true);
  }, [clearDesktopMenuTimeout, desktops.length]);

  const scheduleDesktopMenuClose = useCallback(() => {
    clearDesktopMenuTimeout();
    closeMenuTimeoutRef.current = window.setTimeout(() => {
      setDesktopMenuOpen(false);
    }, 120);
  }, [clearDesktopMenuTimeout]);

  const closeMenu = useCallback(() => {
    if (!open) return;
    clearDesktopMenuTimeout();
    setDesktopMenuOpen(false);
    setOpen(false);
    requestAnimationFrame(() => {
      targetRef.current?.focus();
    });
  }, [clearDesktopMenuTimeout, open, targetRef]);

  const openMenuAt = useCallback(
    (x: number, y: number) => {
      setPosition({ x, y });
      setDesktopMenuOpen(false);
      setOpen(true);
    },
    [],
  );

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      openMenuAt(event.pageX, event.pageY);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === "F10") {
        event.preventDefault();
        event.stopPropagation();
        const rect = node.getBoundingClientRect();
        openMenuAt(rect.left + window.scrollX, rect.bottom + window.scrollY);
      }
    };

    node.addEventListener("contextmenu", handleContextMenu);
    node.addEventListener("keydown", handleKeyDown);

    return () => {
      node.removeEventListener("contextmenu", handleContextMenu);
      node.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuAt, targetRef]);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeMenu, open]);

  useEffect(() => {
    if (!open) return undefined;
    window.dispatchEvent(new CustomEvent("context-menu-open"));
    return () => {
      window.dispatchEvent(new CustomEvent("context-menu-close"));
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const list = menuListRef.current;
      const firstItem = list?.querySelector<HTMLElement>("[role='menuitem']");
      firstItem?.focus();

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let nextX = position.x;
      let nextY = position.y;
      if (rect.right > window.innerWidth) {
        nextX = Math.max(0, position.x - (rect.right - window.innerWidth));
      }
      if (rect.bottom > window.innerHeight) {
        nextY = Math.max(0, position.y - (rect.bottom - window.innerHeight));
      }
      if (nextX !== position.x || nextY !== position.y) {
        setPosition({ x: nextX, y: nextY });
      }
    });
  }, [open, position.x, position.y]);

  useEffect(() => {
    if (!desktopMenuOpen) return;
    requestAnimationFrame(() => {
      const firstItem = submenuRef.current?.querySelector<HTMLElement>(
        "[role='menuitemradio']",
      );
      firstItem?.focus();

      const submenu = submenuRef.current;
      const container = containerRef.current;
      if (!submenu || !container) return;
      const submenuRect = submenu.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (submenuRect.right > window.innerWidth) {
        const offset = submenuRect.right - window.innerWidth;
        setPosition((prev) => ({ x: Math.max(0, prev.x - offset), y: prev.y }));
      }
      if (submenuRect.bottom > window.innerHeight) {
        const offset = submenuRect.bottom - window.innerHeight;
        setSubmenuOffset((prev) => Math.max(0, prev - offset));
      }
    });
  }, [desktopMenuOpen]);

  useEffect(() => () => clearDesktopMenuTimeout(), [clearDesktopMenuTimeout]);

  const handleClose = useCallback(() => {
    closeWindow(windowId);
    closeMenu();
  }, [closeMenu, closeWindow, windowId]);

  const handlePinToggle = useCallback(() => {
    if (isPinned) {
      unpinWindow(windowId);
    } else {
      pinWindow(windowId);
    }
    closeMenu();
  }, [closeMenu, isPinned, pinWindow, unpinWindow, windowId]);

  const handleNewWindow = useCallback(() => {
    if (!allowNewWindow) return;
    openNewWindow(appId);
    closeMenu();
  }, [allowNewWindow, appId, closeMenu, openNewWindow]);

  const handleDesktopSelect = useCallback(
    (desktopId: string) => {
      moveWindowToDesktop(windowId, desktopId);
      setDesktopMenuOpen(false);
      closeMenu();
    },
    [closeMenu, moveWindowToDesktop, windowId],
  );

  const pinLabel = useMemo(
    () => (isPinned ? "Unpin from Taskbar" : "Pin to Taskbar"),
    [isPinned],
  );

  const menuPositionStyle = useMemo(
    () => ({ left: position.x, top: position.y }),
    [position],
  );

  const submenuStyle = useMemo(
    () => ({ top: submenuOffset }),
    [submenuOffset],
  );

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      style={menuPositionStyle}
      className="absolute z-50"
      role="presentation"
      onPointerEnter={clearDesktopMenuTimeout}
      onPointerLeave={scheduleDesktopMenuClose}
    >
      <div className="relative">
        <div
          ref={menuListRef}
          role="menu"
          aria-label="Taskbar item actions"
          className={MENU_CLASSES}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={ITEM_CLASSES}
            onClick={handleClose}
          >
            Close
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={ITEM_CLASSES}
            onClick={handlePinToggle}
          >
            {pinLabel}
          </button>
          <button
            type="button"
            ref={moveButtonRef}
            role="menuitem"
            tabIndex={-1}
            className={`${ITEM_CLASSES} flex items-center justify-between`}
            aria-haspopup="menu"
            aria-expanded={desktopMenuOpen}
            aria-disabled={desktops.length === 0}
            disabled={desktops.length === 0}
            onClick={(event) => {
              event.preventDefault();
              if (desktopMenuOpen) {
                closeDesktopMenu(true);
              } else {
                openDesktopMenu();
              }
            }}
            onPointerEnter={() => {
              if (desktops.length === 0) return;
              openDesktopMenu();
            }}
            onPointerLeave={() => {
              if (!desktopMenuOpen) return;
              scheduleDesktopMenuClose();
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
                if (desktops.length === 0) return;
                event.preventDefault();
                openDesktopMenu();
              } else if (event.key === "ArrowLeft" && desktopMenuOpen) {
                event.preventDefault();
                closeDesktopMenu(true);
              } else if (event.key === "Escape") {
                event.preventDefault();
                if (desktopMenuOpen) {
                  closeDesktopMenu(true);
                } else {
                  closeMenu();
                }
              }
            }}
          >
            <span>Move to Desktop</span>
            <span aria-hidden="true">▸</span>
          </button>
          {allowNewWindow && (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={ITEM_CLASSES}
              onClick={handleNewWindow}
            >
              New Window
            </button>
          )}
        </div>

        {desktopMenuOpen && desktops.length > 0 && (
          <div
            ref={submenuRef}
            role="menu"
            aria-label="Move window to desktop"
            className={`${MENU_CLASSES} absolute left-full ml-1`}
            style={submenuStyle}
            onPointerEnter={clearDesktopMenuTimeout}
            onPointerLeave={scheduleDesktopMenuClose}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                closeDesktopMenu(true);
              } else if (event.key === "Escape") {
                event.preventDefault();
                closeMenu();
              }
            }}
          >
            {desktops.map((desktop) => {
              const isCurrent = desktop.id === currentDesktopId;
              return (
                <button
                  key={desktop.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  tabIndex={-1}
                  className={`${ITEM_CLASSES} flex items-center justify-between`}
                  onClick={() => handleDesktopSelect(desktop.id)}
                >
                  <span>{desktop.name}</span>
                  {isCurrent && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskbarItemMenu;

