"use client";

import React, {
  CSSProperties,
  MutableRefObject,
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const DEFAULT_DELAY = 300;
const OFFSET = 8;
const DEFAULT_PLACEMENTS: TooltipPlacement[] = ["top", "bottom", "right", "left"];

type InputMode = "mouse" | "touch" | "pen" | "keyboard" | "unknown";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

type TriggerType = "focus" | "hover";

interface ShowTooltipOptions {
  id: string;
  content: ReactNode;
  target: HTMLElement | null;
  trigger: TriggerType;
  preferredPlacements?: TooltipPlacement[];
  delay?: number;
}

interface TooltipContextValue {
  showTooltip: (options: ShowTooltipOptions) => void;
  hideTooltip: (id?: string) => void;
  isVisible: (id: string) => boolean;
}

interface TooltipState {
  id: string | null;
  content: ReactNode;
  target: HTMLElement | null;
  targetRect: DOMRect | null;
  visible: boolean;
  preferredPlacements: TooltipPlacement[];
}

const initialState: TooltipState = {
  id: null,
  content: null,
  target: null,
  targetRect: null,
  visible: false,
  preferredPlacements: DEFAULT_PLACEMENTS,
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error("Tooltip components must be used within a <TooltipProvider>.");
  }
  return ctx;
}

type TooltipCoordinates = {
  top: number;
  left: number;
  placement: TooltipPlacement;
};

const clamp = (value: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const mergeRefs = <T,>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> => {
  return (node: T) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
      } else {
        try {
          (ref as MutableRefObject<T | null>).current = node;
        } catch {
          /* noop */
        }
      }
    });
  };
};

function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  theirs: ((event: E) => void) | undefined,
  ours: (event: E) => void,
) {
  return (event: E) => {
    theirs?.(event);
    if (!event.defaultPrevented) {
      ours(event);
    }
  };
}

export const TooltipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TooltipState>(initialState);
  const [mounted, setMounted] = useState(false);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const [canHover, setCanHover] = useState(true);
  const lastInputRef = useRef<InputMode>("unknown");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updatePointerState = () => {
      setCanHover(finePointer.matches);
      if (!finePointer.matches && lastInputRef.current === "mouse") {
        lastInputRef.current = "unknown";
      }
    };
    updatePointerState();

    const handlePointerChange = (event: MediaQueryListEvent) => {
      setCanHover(event.matches);
    };

    finePointer.addEventListener("change", handlePointerChange);

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        lastInputRef.current = "mouse";
      } else if (event.pointerType === "touch") {
        lastInputRef.current = "touch";
      } else {
        lastInputRef.current = "pen";
      }
    };

    const handleKeyDown = () => {
      lastInputRef.current = "keyboard";
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: true });

    return () => {
      finePointer.removeEventListener("change", handlePointerChange);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!state.visible || !state.target) return;

    const updateRect = () => {
      setState((prev) => {
        if (!prev.visible || !prev.target) return prev;
        return {
          ...prev,
          targetRect: prev.target.getBoundingClientRect(),
        };
      });
    };

    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [state.visible, state.target]);

  useEffect(() => {
    if (!state.visible) return;
    const node = tooltipRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      setTooltipSize((prev) => {
        if (prev.width === rect.width && prev.height === rect.height) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => measure());
      observer.observe(node);
      return () => observer.disconnect();
    }

    return undefined;
  }, [state.visible, state.content]);

  const cancelTimers = () => {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const hideTooltip = useCallback((id?: string) => {
    if (typeof window === "undefined") return;
    cancelTimers();
    hideTimer.current = window.setTimeout(() => {
      setState((prev) => {
        if (id && prev.id && prev.id !== id) {
          return prev;
        }
        return initialState;
      });
    }, 0);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.visible) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideTooltip();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [state.visible, hideTooltip]);

  const showTooltip = useCallback(
    ({ id, content, target, trigger, preferredPlacements, delay }: ShowTooltipOptions) => {
      if (typeof window === "undefined") return;
      if (!target) return;

      const isTouchLike =
        lastInputRef.current === "touch" ||
        (!canHover && lastInputRef.current === "pen");

      if (trigger === "hover" && (!canHover || isTouchLike)) {
        return;
      }

      if (trigger === "focus" && isTouchLike && lastInputRef.current !== "keyboard") {
        return;
      }

      cancelTimers();
      const placements = preferredPlacements?.length
        ? preferredPlacements
        : DEFAULT_PLACEMENTS;
      const nextRect = target.getBoundingClientRect();
      showTimer.current = window.setTimeout(() => {
        setTooltipSize({ width: 0, height: 0 });
        setState({
          id,
          content,
          target,
          targetRect: nextRect,
          visible: true,
          preferredPlacements: placements,
        });
      }, delay ?? DEFAULT_DELAY);
    },
    [canHover],
  );

  const coordinates: TooltipCoordinates | null = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!state.visible || !state.targetRect) return null;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const { targetRect } = state;

    const placements = state.preferredPlacements.length
      ? state.preferredPlacements
      : DEFAULT_PLACEMENTS;

    const getCoords = (placement: TooltipPlacement) => {
      const { top, bottom, left, right, width, height } = targetRect;
      const tooltipWidth = tooltipSize.width;
      const tooltipHeight = tooltipSize.height;

      switch (placement) {
        case "top":
          return {
            top: top - tooltipHeight - OFFSET,
            left: left + width / 2 - tooltipWidth / 2,
          };
        case "bottom":
          return {
            top: bottom + OFFSET,
            left: left + width / 2 - tooltipWidth / 2,
          };
        case "left":
          return {
            top: top + height / 2 - tooltipHeight / 2,
            left: left - tooltipWidth - OFFSET,
          };
        case "right":
        default:
          return {
            top: top + height / 2 - tooltipHeight / 2,
            left: right + OFFSET,
          };
      }
    };

    const fitsViewport = (placement: TooltipPlacement) => {
      const coords = getCoords(placement);
      const tooltipWidth = tooltipSize.width;
      const tooltipHeight = tooltipSize.height;
      const clampedTop = clamp(coords.top, OFFSET, viewportHeight - tooltipHeight - OFFSET);
      const clampedLeft = clamp(coords.left, OFFSET, viewportWidth - tooltipWidth - OFFSET);
      const fitsVertically = coords.top >= OFFSET && coords.top + tooltipHeight <= viewportHeight - OFFSET;
      const fitsHorizontally = coords.left >= OFFSET && coords.left + tooltipWidth <= viewportWidth - OFFSET;
      return fitsVertically && fitsHorizontally
        ? { top: coords.top, left: coords.left }
        : { top: clampedTop, left: clampedLeft };
    };

    let chosenPlacement = placements[0] ?? "top";
    for (const placement of placements) {
      const coords = getCoords(placement);
      const tooltipWidth = tooltipSize.width;
      const tooltipHeight = tooltipSize.height;
      const fullyVisible =
        coords.top >= OFFSET &&
        coords.left >= OFFSET &&
        coords.top + tooltipHeight <= viewportHeight - OFFSET &&
        coords.left + tooltipWidth <= viewportWidth - OFFSET;
      if (fullyVisible) {
        chosenPlacement = placement;
        break;
      }
    }

    const finalCoords = fitsViewport(chosenPlacement);

    return {
      top: finalCoords.top,
      left: finalCoords.left,
      placement: chosenPlacement,
    };
  }, [state, tooltipSize]);

  const contextValue = useMemo<TooltipContextValue>(
    () => ({
      showTooltip,
      hideTooltip,
      isVisible: (id: string) => state.visible && state.id === id,
    }),
    [showTooltip, hideTooltip, state.visible, state.id],
  );

  const tooltipStyle: CSSProperties | undefined = coordinates
    ? {
        top: Math.round(coordinates.top),
        left: Math.round(coordinates.left),
        background: "var(--tooltip-bg)",
        color: "var(--tooltip-text)",
        borderColor: "var(--tooltip-border)",
        boxShadow: "var(--tooltip-shadow)",
      }
    : undefined;

  return (
    <TooltipContext.Provider value={contextValue}>
      {children}
      {mounted && state.visible && state.id && coordinates &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            id={state.id}
            data-placement={coordinates.placement}
            className="pointer-events-none fixed z-[2147483646] max-w-xs rounded-md border px-2 py-1 text-xs leading-snug transition-opacity duration-150"
            style={{
              ...tooltipStyle,
              opacity: state.visible ? 1 : 0,
              visibility: state.visible ? "visible" : "hidden",
              willChange: "transform, opacity",
            }}
          >
            {state.content}
          </div>,
          document.body,
        )}
    </TooltipContext.Provider>
  );
};

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  id?: string;
  placement?: TooltipPlacement | TooltipPlacement[];
  delay?: number;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  id,
  placement,
  delay,
  disabled = false,
}) => {
  const { showTooltip, hideTooltip, isVisible } = useTooltipContext();
  const generatedId = useId();
  const tooltipId = id ?? generatedId;
  const triggerRef = useRef<HTMLElement | null>(null);
  const placements = useMemo(() => {
    if (!placement) return undefined;
    return Array.isArray(placement) ? placement : [placement];
  }, [placement]);

  const setRef = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const handleFocus = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      if (disabled) return;
      const target = triggerRef.current ?? (event.currentTarget as HTMLElement | null);
      showTooltip({
        id: tooltipId,
        content,
        target,
        trigger: "focus",
        preferredPlacements: placements,
        delay,
      });
    },
    [disabled, showTooltip, tooltipId, content, placements, delay],
  );

  const handleBlur = useCallback(() => {
    hideTooltip(tooltipId);
  }, [hideTooltip, tooltipId]);

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      const target = triggerRef.current ?? (event.currentTarget as HTMLElement | null);
      showTooltip({
        id: tooltipId,
        content,
        target,
        trigger: "hover",
        preferredPlacements: placements,
        delay,
      });
    },
    [disabled, showTooltip, tooltipId, content, placements, delay],
  );

  const handlePointerLeave = useCallback(() => {
    hideTooltip(tooltipId);
  }, [hideTooltip, tooltipId]);

  const handlePointerDown = useCallback(() => {
    hideTooltip(tooltipId);
  }, [hideTooltip, tooltipId]);

  const childProps = children.props as Record<string, unknown>;
  const describedBy = [childProps["aria-describedby"], isVisible(tooltipId) ? tooltipId : undefined]
    .filter(Boolean)
    .join(" ");

  const cloned = React.cloneElement(children, {
    ref: mergeRefs((children as unknown as { ref?: React.Ref<HTMLElement> }).ref, setRef),
    onFocus: composeEventHandlers(children.props.onFocus, handleFocus),
    onBlur: composeEventHandlers(children.props.onBlur, handleBlur),
    onPointerEnter: composeEventHandlers(children.props.onPointerEnter, handlePointerEnter),
    onPointerLeave: composeEventHandlers(children.props.onPointerLeave, handlePointerLeave),
    onPointerDown: composeEventHandlers(children.props.onPointerDown, handlePointerDown),
    "aria-describedby": describedBy || undefined,
  });

  return cloned;
};

export const useTooltip = useTooltipContext;
