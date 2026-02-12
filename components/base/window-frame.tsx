"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";

import { useShellStore } from "../../hooks/useShellStore";
import styles from "./window.module.css";

type WindowFrameProps = Omit<React.HTMLAttributes<HTMLDivElement>, "id"> & {
  id: string;
  minimized?: boolean;
  maximized?: boolean;
  autoFocus?: boolean;
  focusGuardClassName?: string;
  onRequestFocus?: () => void;
  /**
   * Optional offset applied to the computed z-index. Useful when a consumer
   * needs to elevate a window above the standard desktop stack while still
   * respecting overall ordering.
   */
  zIndexOffset?: number;
};

const stopEventPropagation = (event: React.SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
  const nativeEvent = event.nativeEvent as Event & { stopImmediatePropagation?: () => void };
  nativeEvent.stopImmediatePropagation?.();
};

const WindowFrame = React.forwardRef<HTMLDivElement, WindowFrameProps>(
  (
    {
      id,
      minimized = false,
      maximized = false,
      autoFocus = false,
      focusGuardClassName,
      onRequestFocus,
      zIndexOffset = 0,
      className,
      style,
      children,
      role = "dialog",
      ...rest
    },
    ref,
  ) => {
    const registerWindow = useShellStore((state) => state.registerWindow);
    const unregisterWindow = useShellStore((state) => state.unregisterWindow);
    const focusWindow = useShellStore((state) => state.focusWindow);
    const activeWindowId = useShellStore((state) => state.activeWindowId);
    const getZIndex = useShellStore((state) => state.getZIndex);

    const initialAutoFocus = useRef(autoFocus);

    useEffect(() => {
      registerWindow(id, { activate: initialAutoFocus.current });
      return () => {
        unregisterWindow(id);
      };
    }, [id, registerWindow, unregisterWindow]);

    useEffect(() => {
      if (autoFocus) {
        focusWindow(id);
      }
    }, [autoFocus, focusWindow, id]);

    const isActive = useMemo(() => {
      if (!activeWindowId) return false;
      if (minimized) return false;
      return activeWindowId === id;
    }, [activeWindowId, id, minimized]);

    const zIndex = useMemo(() => getZIndex(id) + zIndexOffset, [getZIndex, id, zIndexOffset]);

    const windowState = minimized ? "minimized" : maximized ? "maximized" : "normal";

    const handleGuardPointerDown = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (isActive) return;
        stopEventPropagation(event);
        focusWindow(id);
        if (onRequestFocus) {
          onRequestFocus();
        }
      },
      [focusWindow, id, isActive, onRequestFocus],
    );

    const handleGuardPointerUp = useCallback<React.PointerEventHandler<HTMLDivElement>>(
      (event) => {
        if (isActive) return;
        stopEventPropagation(event);
      },
      [isActive],
    );

    const handleGuardMouseEvent = useCallback<React.MouseEventHandler<HTMLDivElement>>(
      (event) => {
        if (isActive) return;
        stopEventPropagation(event);
      },
      [isActive],
    );

    const handleGuardWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>(
      (event) => {
        if (isActive) return;
        stopEventPropagation(event);
      },
      [isActive],
    );

    const handleGuardContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isActive) return;
        stopEventPropagation(event);
        focusWindow(id);
        if (onRequestFocus) {
          onRequestFocus();
        }
      },
      [focusWindow, id, isActive, onRequestFocus],
    );

    const guardClasses = clsx(
      "absolute inset-0",
      !isActive ? "pointer-events-auto cursor-default sm:cursor-pointer" : "pointer-events-none",
      focusGuardClassName,
    );

    const frameClasses = clsx(
      "relative flex flex-col overflow-hidden",
      styles.windowFrame,
      isActive ? styles.windowFrameActive : styles.windowFrameInactive,
      maximized && styles.windowFrameMaximized,
      minimized && styles.windowFrameMinimized,
      className,
    );

    const frameStyle = useMemo<React.CSSProperties>(() => ({
      ...style,
      zIndex,
    }), [style, zIndex]);

    return (
      <div
        {...rest}
        ref={ref}
        id={id}
        role={role}
        aria-hidden={minimized || undefined}
        data-window-id={id}
        data-window-state={windowState}
        data-window-active={isActive ? "true" : "false"}
        className={frameClasses}
        style={frameStyle}
      >
        <div
          aria-hidden="true"
          role="presentation"
          data-shell-focus-guard="true"
          className={guardClasses}
          style={{ borderRadius: "inherit" }}
          onPointerDown={handleGuardPointerDown}
          onPointerUp={handleGuardPointerUp}
          onMouseDown={handleGuardMouseEvent}
          onMouseUp={handleGuardMouseEvent}
          onClick={handleGuardMouseEvent}
          onDoubleClick={handleGuardMouseEvent}
          onContextMenu={handleGuardContextMenu}
          onWheel={handleGuardWheel}
        />
        {children}
      </div>
    );
  },
);

WindowFrame.displayName = "WindowFrame";

export default WindowFrame;
