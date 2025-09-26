"use client";

import { useEffect } from "react";
import usePersistentState from "./usePersistentState";

export type PanelPosition = "left" | "bottom";

const PANEL_POSITION_KEY = "desktop:panel-position";
const LEGACY_ORIENTATION_KEY = "xfce.panel.orientation";

const isPanelPosition = (value: unknown): value is PanelPosition =>
  value === "left" || value === "bottom";

const readLegacyOrientation = (): PanelPosition => {
  if (typeof window === "undefined") return "left";
  try {
    const legacy = window.localStorage.getItem(LEGACY_ORIENTATION_KEY);
    if (legacy === "horizontal") return "bottom";
    if (legacy === "vertical") return "left";
  } catch {
    // ignore and fall back to default
  }
  return "left";
};

export default function usePanelPosition() {
  const [position, setPosition] = usePersistentState<PanelPosition>(
    PANEL_POSITION_KEY,
    readLegacyOrientation,
    isPanelPosition,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const orientation = position === "bottom" ? "horizontal" : "vertical";
      window.localStorage.setItem(LEGACY_ORIENTATION_KEY, orientation);
    } catch {
      // ignore persistence errors
    }
  }, [position]);

  return [position, setPosition] as const;
}
