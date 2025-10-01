import { MutableRefObject, useEffect, useRef } from "react";

export interface WheelLikeEvent {
  deltaX: number;
  deltaY: number;
  deltaMode?: number;
}

export interface NormalizedDelta {
  x: number;
  y: number;
}

export interface NormalizedScrollOptions {
  axis?: "x" | "y" | "both";
  overscrollCushion?: number;
  disabled?: boolean;
  reduceMotion?: boolean;
}

const DOM_DELTA_PIXEL = 0;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

const LINE_HEIGHT = 16;
const PAGE_HEIGHT = 800;

const MOMENTUM_THRESHOLD = 4;

export const normalizeWheelDelta = (event: WheelLikeEvent): NormalizedDelta => {
  const mode = event.deltaMode ?? DOM_DELTA_PIXEL;
  let { deltaX, deltaY } = event;

  if (mode === DOM_DELTA_LINE) {
    deltaX *= LINE_HEIGHT;
    deltaY *= LINE_HEIGHT;
  } else if (mode === DOM_DELTA_PAGE) {
    deltaX *= PAGE_HEIGHT;
    deltaY *= PAGE_HEIGHT;
  }

  return {
    x: deltaX,
    y: deltaY,
  };
};

export interface CushionInput {
  position: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    scrollLeft?: number;
    scrollWidth?: number;
    clientWidth?: number;
  };
  delta: number;
  overscrollCushion: number;
  reduceMotion: boolean;
  axis: "x" | "y";
}

export const applyOverscrollCushion = ({
  position,
  delta,
  overscrollCushion,
  reduceMotion,
  axis,
}: CushionInput): number => {
  if (reduceMotion) {
    return delta;
  }

  const { clientHeight, clientWidth = 0 } = position;
  const scrollHeight = position.scrollHeight ?? clientHeight;
  const scrollWidth = position.scrollWidth ?? clientWidth;
  const scrollSize = axis === "y" ? scrollHeight - clientHeight : scrollWidth - clientWidth;

  if (scrollSize <= 0) {
    return delta * overscrollCushion;
  }

  const current = axis === "y" ? position.scrollTop : position.scrollLeft ?? 0;
  const atStart = current <= 0 && delta < 0;
  const atEnd = current >= scrollSize && delta > 0;

  if (!atStart && !atEnd) {
    return delta;
  }

  return delta * overscrollCushion;
};

const hasMomentumScrollSupport = () => {
  if (typeof window === "undefined") return false;
  return typeof CSS !== "undefined" && typeof CSS.supports === "function"
    ? CSS.supports("(-webkit-overflow-scrolling: touch)")
    : false;
};

const shouldRespectNativeMomentum = (event: WheelEvent): boolean => {
  if (event.deltaMode === DOM_DELTA_PIXEL && hasMomentumScrollSupport()) {
    const magnitude = Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY));
    return magnitude <= MOMENTUM_THRESHOLD;
  }
  return false;
};

export const useNormalizedScroll = <T extends HTMLElement>(
  options: NormalizedScrollOptions = {},
): MutableRefObject<T | null> => {
  const { axis = "y", overscrollCushion = 0.18, disabled = false, reduceMotion = false } = options;
  const ref = useRef<T | null>(null);
  const frameRef = useRef<number | null>(null);
  const queued = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) {
      return undefined;
    }

    const flush = () => {
      frameRef.current = null;
      if (axis === "y" || axis === "both") {
        if (queued.current.y !== 0) {
          element.scrollTop += queued.current.y;
          queued.current.y = 0;
        }
      }
      if (axis === "x" || axis === "both") {
        if (queued.current.x !== 0) {
          element.scrollLeft += queued.current.x;
          queued.current.x = 0;
        }
      }
    };

    const schedule = () => {
      if (frameRef.current == null) {
        frameRef.current = window.requestAnimationFrame(flush);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (disabled || event.ctrlKey) {
        return;
      }

      if (shouldRespectNativeMomentum(event)) {
        return;
      }

      const { x, y } = normalizeWheelDelta(event);

      const nextY =
        axis === "y" || axis === "both"
          ? applyOverscrollCushion({
              position: element,
              delta: y,
              overscrollCushion,
              reduceMotion,
              axis: "y",
            })
          : 0;

      const nextX =
        axis === "x" || axis === "both"
          ? applyOverscrollCushion({
              position: element,
              delta: x,
              overscrollCushion,
              reduceMotion,
              axis: "x",
            })
          : 0;

      if (nextX === 0 && nextY === 0) {
        return;
      }

      event.preventDefault();

      if (axis === "y" || axis === "both") {
        queued.current.y += nextY;
      }
      if (axis === "x" || axis === "both") {
        queued.current.x += nextX;
      }

      schedule();
    };

    const listener: EventListener = handleWheel as EventListener;
    element.addEventListener("wheel", listener, { passive: false });

    return () => {
      element.removeEventListener("wheel", listener);
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      queued.current = { x: 0, y: 0 };
    };
  }, [axis, disabled, overscrollCushion, reduceMotion]);

  return ref;
};

export default useNormalizedScroll;
