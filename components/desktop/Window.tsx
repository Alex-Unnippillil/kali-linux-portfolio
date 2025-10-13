import React, { useCallback, useEffect, useId, useRef } from "react";
import BaseWindow from "../base/window";
import {
  clampWindowPositionWithinViewport,
  clampWindowTopPosition,
  measureWindowTopOffset,
} from "../../utils/windowLayout";

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
    const generatedTitleId = useId();

    const contextValue = (props as any)?.context;
    const contextModal = Boolean(
      contextValue && typeof contextValue === "object" && (contextValue as any).modal,
    );
    const modalProp = (props as any)?.modal;
    const isModal = typeof modalProp === "boolean" ? modalProp : contextModal;
    const titleIdProp = (props as any)?.titleId;
    const titleId = typeof titleIdProp === "string" ? titleIdProp : generatedTitleId;
    const ariaModalProp = (props as any)?.ariaModal;
    const ariaModal =
      ariaModalProp !== undefined ? ariaModalProp : (isModal ? true : undefined);
    const windowRoleProp = (props as any)?.windowRole;
    const windowRole = windowRoleProp ?? (isModal ? "dialog" : "region");
    const ariaLabelledByProp = (props as any)?.ariaLabelledBy;
    const ariaLabelledBy = ariaLabelledByProp ?? titleId;

    const normalizedProps = {
      ...props,
      modal: isModal,
      titleId,
      windowRole,
      ariaLabelledBy,
    } as BaseWindowProps;
    if (ariaModal !== undefined) {
      (normalizedProps as any).ariaModal = ariaModal;
    }

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
      const storedPosition = readNodePosition(node);
      const fallbackPosition = {
        x: typeof props.initialX === "number" ? props.initialX : 0,
        y: clampWindowTopPosition(props.initialY, topOffset),
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

      if (typeof props.onPositionChange === "function") {
        props.onPositionChange(clamped.x, clamped.y);
      }
    }, [props.initialX, props.initialY, props.onPositionChange]);

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const handler = () => clampToViewport();
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("resize", handler);
      };
    }, [clampToViewport]);

    return <BaseWindow ref={assignRef} {...normalizedProps} />;
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
