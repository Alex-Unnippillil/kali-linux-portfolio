import React, { useCallback, useEffect, useRef } from "react";
import BaseWindow from "../base/window";
import {
  clampWindowPositionWithinViewport,
  clampWindowTopPosition,
  measureWindowTopOffset,
} from "../../utils/windowLayout";
import { useDesktopZIndex } from "./zIndexManager";

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
      zIndex: zIndexProp,
      ...rest
    } = props;
    const innerRef = useRef<BaseWindowInstance>(null);
    const {
      baseZIndex,
      registerWindow,
      unregisterWindow,
      focusWindow: focusZIndex,
      getZIndex,
    } = useDesktopZIndex();
    const windowId = id ?? null;
    const shouldUseZIndexManager = typeof zIndexProp !== "number";

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
      if (!windowId || !shouldUseZIndexManager) return;
      registerWindow(windowId);
      return () => {
        unregisterWindow(windowId);
      };
    }, [windowId, registerWindow, unregisterWindow, shouldUseZIndexManager]);

    useEffect(() => {
      if (!windowId || !isFocused || !shouldUseZIndexManager) return;
      focusZIndex(windowId);
    }, [windowId, isFocused, focusZIndex, shouldUseZIndexManager]);

    const handleFocus = useCallback(
      (targetId?: string | null) => {
        const resolvedId = targetId ?? windowId;
        if (resolvedId) {
          if (shouldUseZIndexManager) {
            focusZIndex(resolvedId);
          }
          if (typeof focusProp === "function") {
            focusProp(resolvedId);
          }
        } else if (typeof focusProp === "function") {
          focusProp(targetId ?? undefined);
        }
      },
      [focusProp, focusZIndex, windowId],
    );

    const computedZIndex = typeof zIndexProp === "number"
      ? zIndexProp
      : windowId
        ? getZIndex(windowId)
        : baseZIndex;

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const handler = () => clampToViewport();
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("resize", handler);
      };
    }, [clampToViewport]);

    return (
      <BaseWindow
        ref={assignRef}
        {...rest}
        id={id}
        focus={handleFocus}
        isFocused={isFocused}
        zIndex={computedZIndex}
      />
    );
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
