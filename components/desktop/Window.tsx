import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

export type WindowLifecycleState = {
  /** Whether the desktop considers this window focused. */
  isFocused: boolean;
  /** Whether the window is minimized to the dock. */
  isMinimized: boolean;
  /** Whether the document is currently visible. */
  isDocumentVisible: boolean;
  /** Convenience flag for running work only while foregrounded. */
  isForeground: boolean;
};

type WindowLifecycleListener = (state: WindowLifecycleState) => void;

export type WindowLifecycleValue = WindowLifecycleState & {
  /**
   * Subscribe to lifecycle updates. Useful for non-React consumers such as
   * canvas render loops.
   */
  subscribe: (listener: WindowLifecycleListener) => () => void;
};

const getDocumentVisibility = () =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

const computeLifecycleState = (state: Partial<WindowLifecycleState>) => {
  const isFocused = Boolean(state.isFocused);
  const isMinimized = Boolean(state.isMinimized);
  const isDocumentVisible =
    typeof state.isDocumentVisible === "boolean"
      ? state.isDocumentVisible
      : getDocumentVisibility();

  return {
    isFocused,
    isMinimized,
    isDocumentVisible,
    isForeground: isFocused && !isMinimized && isDocumentVisible,
  } satisfies WindowLifecycleState;
};

const defaultLifecycleState: WindowLifecycleState = computeLifecycleState({
  isFocused: true,
  isMinimized: false,
  isDocumentVisible: getDocumentVisibility(),
});

export const WindowLifecycleContext = React.createContext<WindowLifecycleValue>(
  {
    ...defaultLifecycleState,
    subscribe: () => () => undefined,
  },
);

export const useWindowLifecycle = () =>
  React.useContext(WindowLifecycleContext);

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

const lifecycleEqual = (
  a: WindowLifecycleState,
  b: WindowLifecycleState,
) =>
  a.isFocused === b.isFocused &&
  a.isMinimized === b.isMinimized &&
  a.isDocumentVisible === b.isDocumentVisible &&
  a.isForeground === b.isForeground;

const DesktopWindow = React.forwardRef<BaseWindowInstance, BaseWindowProps>(
  (props, forwardedRef) => {
    const innerRef = useRef<BaseWindowInstance>(null);
    const listenersRef = useRef<Set<WindowLifecycleListener>>(new Set());
    const [lifecycle, setLifecycle] = useState<WindowLifecycleState>(() =>
      computeLifecycleState({
        isFocused: Boolean(props.isFocused),
        isMinimized: Boolean(props.minimized),
        isDocumentVisible: getDocumentVisibility(),
      }),
    );
    const lifecycleRef = useRef(lifecycle);
    const { initialX, initialY, onPositionChange } = props;

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

    useEffect(() => {
      lifecycleRef.current = lifecycle;
    }, [lifecycle]);

    const updateLifecycle = useCallback(
      (partial: Partial<WindowLifecycleState>) => {
        setLifecycle((prev) => {
          const next = computeLifecycleState({ ...prev, ...partial });
          if (lifecycleEqual(prev, next)) {
            return prev;
          }
          lifecycleRef.current = next;
          listenersRef.current.forEach((listener) => {
            try {
              listener(next);
            } catch (err) {
              // Swallow listener errors to avoid breaking window updates.
              if (process.env.NODE_ENV !== "production") {
                console.error("Window lifecycle listener failed", err);
              }
            }
          });
          return next;
        });
      },
      [],
    );

    const subscribe = useCallback((listener: WindowLifecycleListener) => {
      listenersRef.current.add(listener);
      listener(lifecycleRef.current);
      return () => {
        listenersRef.current.delete(listener);
      };
    }, []);

    useEffect(() => {
      updateLifecycle({ isFocused: Boolean(props.isFocused) });
    }, [props.isFocused, updateLifecycle]);

    useEffect(() => {
      updateLifecycle({ isMinimized: Boolean(props.minimized) });
    }, [props.minimized, updateLifecycle]);

    useEffect(() => {
      if (typeof document === "undefined") return undefined;
      const handler = () =>
        updateLifecycle({ isDocumentVisible: getDocumentVisibility() });
      document.addEventListener("visibilitychange", handler);
      return () => {
        document.removeEventListener("visibilitychange", handler);
      };
    }, [updateLifecycle]);

    useEffect(() => {
      const instance = innerRef.current;
      const node =
        instance && typeof instance.getWindowNode === "function"
          ? instance.getWindowNode()
          : null;
      if (!node) return undefined;

      const handleFocus = () => updateLifecycle({ isFocused: true });
      const handleBlur = () => updateLifecycle({ isFocused: false });
      node.addEventListener("focus", handleFocus);
      node.addEventListener("blur", handleBlur);
      return () => {
        node.removeEventListener("focus", handleFocus);
        node.removeEventListener("blur", handleBlur);
      };
    }, [updateLifecycle, props.id]);

    const lifecycleValue = useMemo<WindowLifecycleValue>(
      () => ({
        ...lifecycle,
        subscribe,
      }),
      [lifecycle, subscribe],
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

    return (
      <WindowLifecycleContext.Provider value={lifecycleValue}>
        <BaseWindow ref={assignRef} {...props} />
      </WindowLifecycleContext.Provider>
    );
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
