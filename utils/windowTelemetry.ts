import { trackEvent } from "@/lib/analytics-client";

export type WindowEventName =
  | "wm_open"
  | "wm_close"
  | "wm_minimize"
  | "wm_maximize"
  | "wm_restore"
  | "wm_snap"
  | "wm_drag_end"
  | "wm_resize_end";

type DOMRectLike = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

type WindowTelemetryPayload = {
  id: string | null | undefined;
  bounds?: DOMRectLike | null;
  snap?: string | null | undefined;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const sanitizeBounds = (rect?: DOMRectLike | null): string => {
  if (!rect) {
    return "unavailable";
  }

  const { left, top, width, height } = rect;
  if (
    !isFiniteNumber(left) ||
    !isFiniteNumber(top) ||
    !isFiniteNumber(width) ||
    !isFiniteNumber(height)
  ) {
    return "unavailable";
  }

  const rounded = {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.max(0, Math.round(width)),
    height: Math.max(0, Math.round(height)),
  };

  return JSON.stringify(rounded);
};

const sanitizeSnap = (snap?: string | null): string => {
  if (!snap) {
    return "none";
  }

  const trimmed = snap.trim();
  return trimmed ? trimmed : "none";
};

export const emitWindowEvent = (
  name: WindowEventName,
  payload: WindowTelemetryPayload,
): void => {
  const id = typeof payload.id === "string" ? payload.id : null;
  if (!id) {
    return;
  }

  try {
    trackEvent(name, {
      id,
      bounds: sanitizeBounds(payload.bounds ?? null),
      snap: sanitizeSnap(payload.snap ?? null),
    });
  } catch {
    // Silently ignore analytics errors to keep UI responsive.
  }
};

