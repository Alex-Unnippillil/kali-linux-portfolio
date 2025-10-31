import { useEffect, useRef, useState } from "react";

type VisualViewportState = {
  width: number;
  height: number;
  left: number;
  top: number;
  innerWidth: number;
  innerHeight: number;
  scale: number;
};

const DEFAULT_VIEWPORT: VisualViewportState = {
  width: 0,
  height: 0,
  left: 0,
  top: 0,
  innerWidth: 0,
  innerHeight: 0,
  scale: 1,
};

const readMetrics = (win?: Window | null): VisualViewportState => {
  if (!win) {
    return DEFAULT_VIEWPORT;
  }

  const fallbackWidth = typeof win.innerWidth === "number" ? win.innerWidth : 0;
  const fallbackHeight = typeof win.innerHeight === "number" ? win.innerHeight : 0;
  const viewport = win.visualViewport;

  if (viewport) {
    const width = Number.isFinite(viewport.width) ? viewport.width : fallbackWidth;
    const height = Number.isFinite(viewport.height) ? viewport.height : fallbackHeight;
    const left = Number.isFinite(viewport.offsetLeft) ? viewport.offsetLeft : 0;
    const top = Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0;
    const scale = Number.isFinite(viewport.scale) ? viewport.scale : 1;

    return {
      width: width || fallbackWidth,
      height: height || fallbackHeight,
      left,
      top,
      innerWidth: fallbackWidth,
      innerHeight: fallbackHeight,
      scale,
    };
  }

  return {
    width: fallbackWidth,
    height: fallbackHeight,
    left: 0,
    top: 0,
    innerWidth: fallbackWidth,
    innerHeight: fallbackHeight,
    scale: 1,
  };
};

const scheduleAnimationFrame = (
  win: Window,
  callback: FrameRequestCallback,
): { cancel: () => void } => {
  if (typeof win.requestAnimationFrame === "function") {
    const id = win.requestAnimationFrame(callback);
    return {
      cancel: () => {
        if (typeof win.cancelAnimationFrame === "function") {
          win.cancelAnimationFrame(id);
        }
      },
    };
  }

  callback(Date.now());
  return {
    cancel: () => {},
  };
};

export const useVisualViewport = (): VisualViewportState => {
  const [state, setState] = useState<VisualViewportState>(() =>
    readMetrics(typeof window !== "undefined" ? window : undefined),
  );
  const frameRef = useRef<{ cancel: () => void } | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const win = window;
    const getTarget = () => {
      const viewport = win.visualViewport;
      if (
        viewport &&
        typeof viewport.addEventListener === "function" &&
        typeof viewport.removeEventListener === "function"
      ) {
        return viewport as VisualViewport & EventTarget;
      }
      return win;
    };

    const update = () => {
      pendingRef.current = false;
      frameRef.current = null;
      setState(readMetrics(win));
    };

    const scheduleUpdate = () => {
      if (pendingRef.current) {
        return;
      }
      pendingRef.current = true;
      frameRef.current = scheduleAnimationFrame(win, () => update());
    };

    const target = getTarget();
    const events: Array<keyof VisualViewportEventMap | keyof WindowEventMap> = [
      "resize",
      "scroll",
    ];

    events.forEach((event) => {
      target.addEventListener(event as string, scheduleUpdate, { passive: true } as EventListenerOptions);
    });

    return () => {
      frameRef.current?.cancel();
      frameRef.current = null;
      pendingRef.current = false;
      events.forEach((event) => {
        target.removeEventListener(event as string, scheduleUpdate as EventListener);
      });
    };
  }, []);

  return state;
};

export type { VisualViewportState };

export default useVisualViewport;
