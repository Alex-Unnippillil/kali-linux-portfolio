"use client";

import { useEffect } from "react";

type ArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";
type SnapPosition =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
type SnapState = SnapPosition | "floating";

interface WindowSnapDetail {
  inset: string;
  width: number;
  height: number;
  snapState: SnapPosition;
}

interface SnapStyle {
  inset: string;
  width: string;
  height: string;
  widthPercent: number;
  heightPercent: number;
}

const SNAP_STYLES: Record<SnapPosition, SnapStyle> = {
  left: {
    inset: "0 auto 0 0",
    width: "50%",
    height: "100%",
    widthPercent: 50,
    heightPercent: 100,
  },
  right: {
    inset: "0 0 0 auto",
    width: "50%",
    height: "100%",
    widthPercent: 50,
    heightPercent: 100,
  },
  top: {
    inset: "0 0 auto 0",
    width: "100%",
    height: "50%",
    widthPercent: 100,
    heightPercent: 50,
  },
  bottom: {
    inset: "auto 0 0 0",
    width: "100%",
    height: "50%",
    widthPercent: 100,
    heightPercent: 50,
  },
  "top-left": {
    inset: "0 auto auto 0",
    width: "50%",
    height: "50%",
    widthPercent: 50,
    heightPercent: 50,
  },
  "top-right": {
    inset: "0 0 auto auto",
    width: "50%",
    height: "50%",
    widthPercent: 50,
    heightPercent: 50,
  },
  "bottom-left": {
    inset: "auto auto 0 0",
    width: "50%",
    height: "50%",
    widthPercent: 50,
    heightPercent: 50,
  },
  "bottom-right": {
    inset: "auto 0 0 auto",
    width: "50%",
    height: "50%",
    widthPercent: 50,
    heightPercent: 50,
  },
};

const SNAP_TRANSITIONS: Record<ArrowKey, Record<SnapState, SnapPosition>> = {
  ArrowLeft: {
    floating: "left",
    left: "left",
    right: "left",
    top: "top-left",
    bottom: "bottom-left",
    "top-left": "top-left",
    "top-right": "top-left",
    "bottom-left": "bottom-left",
    "bottom-right": "bottom-left",
  },
  ArrowRight: {
    floating: "right",
    left: "right",
    right: "right",
    top: "top-right",
    bottom: "bottom-right",
    "top-left": "top-right",
    "top-right": "top-right",
    "bottom-left": "bottom-right",
    "bottom-right": "bottom-right",
  },
  ArrowUp: {
    floating: "top",
    left: "top-left",
    right: "top-right",
    top: "top",
    bottom: "top",
    "top-left": "top-left",
    "top-right": "top-right",
    "bottom-left": "top-left",
    "bottom-right": "top-right",
  },
  ArrowDown: {
    floating: "bottom",
    left: "bottom-left",
    right: "bottom-right",
    top: "bottom",
    bottom: "bottom",
    "top-left": "bottom-left",
    "top-right": "bottom-right",
    "bottom-left": "bottom-left",
    "bottom-right": "bottom-right",
  },
};

const ARROW_KEYS: Set<string> = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

export interface WindowTilingHotkeysProps {
  enabled?: boolean;
  getFocusedWindowId?: () => string | null;
}

const getSnapState = (element: HTMLElement): SnapState => {
  const state = element.dataset.snapState as SnapState | undefined;
  return state ?? "floating";
};

const WindowTilingHotkeys = ({ enabled = true, getFocusedWindowId }: WindowTilingHotkeysProps) => {
  useEffect(() => {
    if (!enabled) return;

    const getFocusedWindow = (): HTMLElement | null => {
      if (typeof document === "undefined") return null;
      const id = getFocusedWindowId?.() ?? null;
      if (id) {
        const target = document.getElementById(id);
        if (target instanceof HTMLElement) {
          return target;
        }
      }
      return document.querySelector<HTMLElement>(".opened-window:not(.notFocused)");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey) return;
      if (!ARROW_KEYS.has(event.key)) return;

      const element = getFocusedWindow();
      if (!element) return;

      event.preventDefault();

      const currentState = getSnapState(element);
      const direction = event.key as ArrowKey;
      const nextState = SNAP_TRANSITIONS[direction][currentState] ?? SNAP_TRANSITIONS[direction].floating;
      const snapStyle = SNAP_STYLES[nextState];

      element.style.inset = snapStyle.inset;
      element.style.width = snapStyle.width;
      element.style.height = snapStyle.height;
      element.style.transform = "translate(0px, 0px)";
      element.dataset.snapState = nextState;
      element.dispatchEvent(
        new CustomEvent<WindowSnapDetail>("window-tiling", {
          detail: {
            inset: snapStyle.inset,
            width: snapStyle.widthPercent,
            height: snapStyle.heightPercent,
            snapState: nextState,
          },
        }),
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, getFocusedWindowId]);

  return null;
};

export default WindowTilingHotkeys;
