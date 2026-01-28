import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import BaseWindow from "../base/window";
import { AnimatePresence, motion } from "framer-motion";
import {
  clampWindowPositionWithinViewport,
  clampWindowTopPosition,
  measureWindowTopOffset,
} from "../../utils/windowLayout";
import { useDesktopZIndex } from "./zIndexManager";
import useIsMobile from "../../hooks/useIsMobile";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";

type BaseWindowProps = React.ComponentProps<typeof BaseWindow>;
// BaseWindow is a class component, so the instance type exposes helper methods.
type BaseWindowInstance = InstanceType<typeof BaseWindow> | null;

type MutableRef<T> = React.MutableRefObject<T>;

const parsePx = (value?: string | null): number | null => {
  if (typeof value !== "string") return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readNodePosition = (node: HTMLElement): { x: number; y: number } | null => {
  const style = node.style as CSSStyleDeclaration | undefined;
  if (!style) {
    return null;
  }

  if (typeof style.getPropertyValue === "function") {
    const x = parsePx(style.getPropertyValue("--window-transform-x"));
    const y = parsePx(style.getPropertyValue("--window-transform-y"));
    if (x !== null && y !== null) {
      return { x, y };
    }
  }

  const transform = style.transform;
  if (typeof transform === "string" && transform.length) {
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
    if (match) {
      const parsedX = parseFloat(match[1]);
      const parsedY = parseFloat(match[2]);
      if (Number.isFinite(parsedX) && Number.isFinite(parsedY)) {
        return { x: parsedX, y: parsedY };
      }
    }
  }

  return null;
};

const DesktopWindow = React.forwardRef<BaseWindowInstance, BaseWindowProps>(
  (props, forwardedRef) => {
    const {
      id,
      focus: focusProp,
      isFocused,
      zIndex: _ignoredZIndex,
      ...rest
    } = props;
    const innerRef = useRef<BaseWindowInstance>(null);
    const isMobile = useIsMobile();
    const prefersReducedMotion = usePrefersReducedMotion();
    const [isClosing, setIsClosing] = useState(false);
    const [minimizeOffset, setMinimizeOffset] = useState({ x: 0, y: 0 });
    const [transformOrigin, setTransformOrigin] = useState<string | undefined>(undefined);
    const {
      baseZIndex,
      registerWindow,
      unregisterWindow,
      focusWindow: focusZIndex,
      getZIndex,
    } = useDesktopZIndex();
    const windowId = id ?? null;

    const assignRef = useCallback(
      (instance: BaseWindowInstance) => {
        innerRef.current = instance;
        if (!forwardedRef) return;
        if (typeof forwardedRef === "function") {
          forwardedRef(instance);
        } else {
          (forwardedRef as MutableRef<BaseWindowInstance>).current = instance;
        }
      },
      [forwardedRef],
    );

    const clampToViewport = useCallback(() => {
      if (typeof window === "undefined") return;
      const instance = innerRef.current;
      const node = instance && typeof instance.getWindowNode === "function"
        ? instance.getWindowNode()
        : null;
      if (!node || typeof node.getBoundingClientRect !== "function") return;

      const rect = node.getBoundingClientRect();
      const topOffset = measureWindowTopOffset();
      const visualViewport = window.visualViewport;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const combinedTopOffset = viewportTop + topOffset;
      const storedPosition = readNodePosition(node);
      const fallbackPosition = {
        x: typeof props.initialX === "number"
          ? props.initialX + viewportLeft
          : viewportLeft,
        y: clampWindowTopPosition(props.initialY, combinedTopOffset),
      };
      const currentPosition = storedPosition || fallbackPosition;
      const clamped = clampWindowPositionWithinViewport(currentPosition, rect, {
        viewportWidth,
        viewportHeight,
        viewportLeft,
        viewportTop,
        topOffset,
      });
      if (!clamped) return;
      if (clamped.x === currentPosition.x && clamped.y === currentPosition.y) {
        return;
      }

      node.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
      if (typeof node.style.setProperty === "function") {
        node.style.setProperty("--window-transform-x", `${clamped.x}px`);
        node.style.setProperty("--window-transform-y", `${clamped.y}px`);
      } else {
        (node.style as unknown as Record<string, string>)["--window-transform-x"] = `${clamped.x}px`;
        (node.style as unknown as Record<string, string>)["--window-transform-y"] = `${clamped.y}px`;
      }

      if (typeof props.onPositionChange === "function") {
        props.onPositionChange(clamped.x, clamped.y);
      }
    }, [props.initialX, props.initialY, props.onPositionChange]);

    useEffect(() => {
      if (!windowId) return;
      registerWindow(windowId);
      return () => {
        unregisterWindow(windowId);
      };
    }, [windowId, registerWindow, unregisterWindow]);

    useEffect(() => {
      if (!windowId || !isFocused) return;
      focusZIndex(windowId);
    }, [windowId, isFocused, focusZIndex]);

    const handleFocus = useCallback(
      (targetId?: string | null) => {
        const resolvedId = targetId ?? windowId;
        if (resolvedId) {
          focusZIndex(resolvedId);
          if (typeof focusProp === "function") {
            focusProp(resolvedId);
          }
        } else if (typeof focusProp === "function") {
          focusProp(targetId ?? undefined);
        }
      },
      [focusProp, focusZIndex, windowId],
    );

    const computedZIndex = windowId ? getZIndex(windowId) : baseZIndex;

    const updateMotionMetrics = useCallback(() => {
      if (typeof window === "undefined") return;
      const instance = innerRef.current;
      const node = instance && typeof instance.getWindowNode === "function"
        ? instance.getWindowNode()
        : null;
      if (!node || typeof node.getBoundingClientRect !== "function") return;

      const rect = node.getBoundingClientRect();
      const windowCenterX = rect.left + rect.width / 2;
      const windowCenterY = rect.top + rect.height / 2;
      setTransformOrigin(`${windowCenterX}px ${windowCenterY}px`);

      if (!windowId) return;
      const taskbarButton = document.querySelector(
        `button[data-context="taskbar"][data-app-id="${windowId}"]`,
      );
      if (!(taskbarButton instanceof HTMLElement)) {
        setMinimizeOffset({ x: 0, y: 0 });
        return;
      }

      const taskbarRect = taskbarButton.getBoundingClientRect();
      const targetX = taskbarRect.left + taskbarRect.width / 2;
      const targetY = taskbarRect.top + taskbarRect.height / 2;
      setMinimizeOffset({
        x: targetX - windowCenterX,
        y: targetY - windowCenterY,
      });
    }, [windowId]);

    useLayoutEffect(() => {
      updateMotionMetrics();
    }, [updateMotionMetrics, props.minimized, isMobile]);

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const handleResize = () => updateMotionMetrics();
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [updateMotionMetrics]);

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const handler = () => clampToViewport();
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("resize", handler);
      };
    }, [clampToViewport]);

    const resolvedInitialX = isMobile ? 0 : props.initialX;
    const resolvedInitialY = isMobile ? 0 : props.initialY;
    const resolvedDefaultWidth = isMobile ? 100 : rest.defaultWidth;
    const resolvedDefaultHeight = isMobile ? 100 : rest.defaultHeight;
    const resolvedMinWidth = isMobile ? 100 : rest.minWidth;
    const resolvedMinHeight = isMobile ? 100 : rest.minHeight;
    const resolvedResizable = isMobile ? false : rest.resizable;
    const minimizeScale = isMobile ? 0.82 : 0.7;

    const motionTransition = useMemo(() => {
      if (prefersReducedMotion) {
        return { duration: 0 };
      }
      return { type: "spring", stiffness: 320, damping: 28, mass: 0.7 };
    }, [prefersReducedMotion]);

    const motionAnimate = isClosing
      ? {
        opacity: 0,
        scale: 0.95,
        x: 0,
        y: 0,
        transition: motionTransition,
      }
      : props.minimized
      ? {
        opacity: 0,
        scale: minimizeScale,
        x: minimizeOffset.x,
        y: minimizeOffset.y,
        transition: motionTransition,
        transitionEnd: { visibility: "hidden" },
      }
      : {
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        transition: motionTransition,
        visibility: "visible",
      };

    return (
      <AnimatePresence initial={false}>
        <motion.div
          key={windowId || "window"}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={motionAnimate}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            transformOrigin: transformOrigin || "center",
            pointerEvents: props.minimized || isClosing ? "none" : "auto",
          }}
        >
          <BaseWindow
            ref={assignRef}
            {...rest}
            id={id}
            focus={handleFocus}
            isFocused={isFocused}
            zIndex={computedZIndex}
            initialX={resolvedInitialX}
            initialY={resolvedInitialY}
            defaultWidth={resolvedDefaultWidth}
            defaultHeight={resolvedDefaultHeight}
            minWidth={resolvedMinWidth}
            minHeight={resolvedMinHeight}
            resizable={resolvedResizable}
            disableDragging={isMobile}
            suppressMinimizedStyles
            onCloseStart={() => setIsClosing(true)}
          />
        </motion.div>
      </AnimatePresence>
    );
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
