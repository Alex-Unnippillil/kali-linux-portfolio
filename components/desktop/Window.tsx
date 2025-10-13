import React, { useCallback, useEffect, useRef } from "react";
import BaseWindow from "../base/window";
import {
  clampWindowPositionWithinViewport,
  clampWindowTopPosition,
  consumeSharedWindowState,
  measureWindowTopOffset,
  readWindowNodePosition,
} from "../../utils/windowLayout";

type SerializedWindowState = import("../../types/windowState").SerializedWindowState;

type BaseWindowProps = React.ComponentProps<typeof BaseWindow>;
// BaseWindow is a class component, so the instance type exposes helper methods.
type BaseWindowInstance = InstanceType<typeof BaseWindow> | null;

type MutableRef<T> = React.MutableRefObject<T>;

const DesktopWindow = React.forwardRef<BaseWindowInstance, BaseWindowProps>(
  (props, forwardedRef) => {
    const innerRef = useRef<BaseWindowInstance>(null);
    const { initialX, initialY, onPositionChange, id } = props;

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
      const storedPosition = readWindowNodePosition(node);
      const fallbackPosition = {
        x: typeof initialX === "number" ? initialX : 0,
        y: clampWindowTopPosition(initialY, topOffset),
      };
      const currentPosition = storedPosition || fallbackPosition;
      const clamped = clampWindowPositionWithinViewport(currentPosition, rect, {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
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

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const handler = () => clampToViewport();
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("resize", handler);
      };
    }, [clampToViewport]);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const instance = innerRef.current as (BaseWindowInstance & {
        applySerializedState?: (snapshot: SerializedWindowState) => void;
      }) | null;
      if (!instance || typeof instance.applySerializedState !== "function") {
        return;
      }

      const snapshot = consumeSharedWindowState(id) as SerializedWindowState | null;
      if (!snapshot) return;

      instance.applySerializedState(snapshot);
    }, [id]);

    return <BaseWindow ref={assignRef} {...props} />;
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
