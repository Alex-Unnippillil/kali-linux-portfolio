import React, { useCallback, useEffect, useRef } from "react";
import BaseWindow from "../base/window";
import {
  clampWindowPositionWithinViewport,
  clampWindowTopPosition,
  measureWindowTopOffset,
  getViewportSize,
  subscribeToLayoutChanges,
} from "../../utils/windowLayout";

type BaseWindowProps = React.ComponentProps<typeof BaseWindow>;
// BaseWindow is a class component, so the instance type exposes helper methods.
type BaseWindowInstance = InstanceType<typeof BaseWindow> | null;

type MutableRef<T> = React.MutableRefObject<T>;

type FrameHandle = { cancel: () => void };

const scheduleFrame = (callback: () => void): FrameHandle => {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    const id = window.requestAnimationFrame(() => {
      callback();
    });
    return { cancel: () => window.cancelAnimationFrame(id) };
  }
  const timeout = setTimeout(() => {
    callback();
  }, 16);
  return { cancel: () => clearTimeout(timeout) };
};

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
    const writeFrameRef = useRef<FrameHandle | null>(null);
    const writePayloadRef = useRef<{ node: HTMLElement; x: number; y: number } | null>(null);

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

    const schedulePositionWrite = useCallback((node: HTMLElement, x: number, y: number) => {
      writePayloadRef.current = { node, x, y };
      if (writeFrameRef.current) {
        return;
      }
      writeFrameRef.current = scheduleFrame(() => {
        const payload = writePayloadRef.current;
        writeFrameRef.current = null;
        writePayloadRef.current = null;
        if (!payload) return;
        const { node: target, x: nextX, y: nextY } = payload;
        target.style.transform = `translate(${nextX}px, ${nextY}px)`;
        if (typeof target.style.setProperty === "function") {
          target.style.setProperty("--window-transform-x", `${nextX}px`);
          target.style.setProperty("--window-transform-y", `${nextY}px`);
        } else {
          (target.style as unknown as Record<string, string>)["--window-transform-x"] = `${nextX}px`;
          (target.style as unknown as Record<string, string>)["--window-transform-y"] = `${nextY}px`;
        }
      });
    }, []);

    const clampToViewport = useCallback(() => {
      if (typeof window === "undefined") return;
      const instance = innerRef.current;
      const node = instance && typeof instance.getWindowNode === "function"
        ? instance.getWindowNode()
        : null;
      if (!node || typeof node.getBoundingClientRect !== "function") return;

      const rect = node.getBoundingClientRect();
      const { width: viewportWidth, height: viewportHeight } = getViewportSize();
      const topOffset = measureWindowTopOffset();
      const storedPosition = readNodePosition(node);
      const fallbackPosition = {
        x: typeof props.initialX === "number" ? props.initialX : 0,
        y: clampWindowTopPosition(props.initialY, topOffset),
      };
      const currentPosition = storedPosition || fallbackPosition;
      const clamped = clampWindowPositionWithinViewport(currentPosition, rect, {
        viewportWidth,
        viewportHeight,
        topOffset,
      });
      if (!clamped) return;
      if (clamped.x === currentPosition.x && clamped.y === currentPosition.y) {
        return;
      }

      schedulePositionWrite(node, clamped.x, clamped.y);

      if (typeof props.onPositionChange === "function") {
        props.onPositionChange(clamped.x, clamped.y);
      }
    }, [props.initialX, props.initialY, props.onPositionChange, schedulePositionWrite]);

    useEffect(() => {
      if (writeFrameRef.current) {
        writeFrameRef.current.cancel();
        writeFrameRef.current = null;
      }
      writePayloadRef.current = null;
      return () => {
        if (writeFrameRef.current) {
          writeFrameRef.current.cancel();
          writeFrameRef.current = null;
        }
        writePayloadRef.current = null;
      };
    }, []);

    useEffect(() => {
      const unsubscribe = subscribeToLayoutChanges(clampToViewport);
      clampToViewport();
      return () => {
        unsubscribe();
      };
    }, [clampToViewport]);

    useEffect(() => {
      if (typeof ResizeObserver === "undefined") {
        return undefined;
      }
      const instance = innerRef.current;
      const node = instance && typeof instance.getWindowNode === "function"
        ? instance.getWindowNode()
        : null;
      if (!node) {
        return undefined;
      }
      const observer = new ResizeObserver(() => {
        clampToViewport();
      });
      observer.observe(node);
      return () => {
        observer.disconnect();
      };
    }, [clampToViewport, props.id]);

    return <BaseWindow ref={assignRef} {...props} />;
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
