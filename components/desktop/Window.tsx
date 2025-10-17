import React, { useCallback, useEffect, useRef } from "react";
import BaseWindow from "../base/window";
import {
  clampWindowPositionWithinViewport,
  clampWindowTopPosition,
  measureWindowTopOffset,
} from "../../utils/windowLayout";
import { desktopViewportDefaultValue, useDesktopViewport } from "./viewportContext";

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
    const innerRef = useRef<BaseWindowInstance>(null);

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

    const { initialX, initialY, onPositionChange } = props;

    const clampToViewport = useCallback(
      (dimensions?: { width: number; height: number }) => {
      if (typeof window === "undefined") return;
      const instance = innerRef.current;
      const node = instance && typeof instance.getWindowNode === "function"
        ? instance.getWindowNode()
        : null;
      if (!node || typeof node.getBoundingClientRect !== "function") return;

      const rect = node.getBoundingClientRect();
      const topOffset = measureWindowTopOffset();
      const storedPosition = readNodePosition(node);
      const fallbackPosition = {
        x: typeof initialX === "number" ? initialX : 0,
        y: clampWindowTopPosition(initialY, topOffset),
      };
      const currentPosition = storedPosition || fallbackPosition;
      const viewportWidth =
        typeof dimensions?.width === "number" ? dimensions.width : window.innerWidth;
      const viewportHeight =
        typeof dimensions?.height === "number" ? dimensions.height : window.innerHeight;

      const clamped = clampWindowPositionWithinViewport(currentPosition, rect, {
        viewportWidth,
        viewportHeight,
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
      if (typeof onPositionChange === "function") {
        onPositionChange(clamped.x, clamped.y);
      }
    }, [initialX, initialY, onPositionChange]);

    const viewport = useDesktopViewport();
    const usingDefaultContext = viewport === desktopViewportDefaultValue;

    useEffect(() => {
      const size = viewport.getSize();
      if (size) {
        clampToViewport(size);
      } else {
        clampToViewport();
      }
      if (usingDefaultContext) {
        if (typeof window === "undefined") {
          return undefined;
        }
        const handler = () => clampToViewport();
        window.addEventListener("resize", handler);
        return () => {
          window.removeEventListener("resize", handler);
        };
      }

      const unsubscribe = viewport.subscribe((nextSize) => {
        clampToViewport(nextSize);
      });
      return () => {
        unsubscribe();
      };
    }, [clampToViewport, viewport, usingDefaultContext]);

    return <BaseWindow ref={assignRef} {...props} />;
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
