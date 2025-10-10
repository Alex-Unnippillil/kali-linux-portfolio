import { DESKTOP_TOP_PADDING, NAVBAR_HEIGHT, SNAP_BOTTOM_INSET } from "./uiConstants";

const NAVBAR_SELECTOR = ".main-navbar-vp";
const NAVBAR_VERTICAL_PADDING = 16; // 0.5rem top + 0.5rem bottom
const DEFAULT_NAVBAR_HEIGHT = NAVBAR_HEIGHT + NAVBAR_VERTICAL_PADDING;
const WINDOW_TOP_MARGIN = 8;

const EDGE_THRESHOLD_MIN = 48;
const EDGE_THRESHOLD_MAX = 160;
const EDGE_THRESHOLD_RATIO = 0.05;

const SAFE_AREA_PROPERTIES = {
  top: "--safe-area-top",
  right: "--safe-area-right",
  bottom: "--safe-area-bottom",
  left: "--safe-area-left",
} as const;

type SafeAreaProperty = keyof typeof SAFE_AREA_PROPERTIES;

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SnapRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type SnapRegionKey = "left" | "right" | "top";
export type SnapRegions = Record<SnapRegionKey, SnapRegion>;

interface ClampViewportOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  topOffset?: number;
  bottomInset?: number;
}

type DimensionsLike = Pick<DOMRectReadOnly, "width" | "height"> | {
  width?: number;
  height?: number;
} | null | undefined;

type PositionLike = {
  x?: number | null;
  y?: number | null;
} | null | undefined;

const parseSafeAreaValue = (value: string | null | undefined): number => {
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readSafeAreaInset = (
  computed: CSSStyleDeclaration | null,
  property: string,
): number => {
  if (!computed || typeof computed.getPropertyValue !== "function") return 0;
  return parseSafeAreaValue(computed.getPropertyValue(property));
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

export const getSafeAreaInsets = (): SafeAreaInsets => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const computed = window.getComputedStyle(document.documentElement);
  return {
    top: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.top),
    right: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.right),
    bottom: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.bottom),
    left: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.left),
  };
};

export const measureSafeAreaInset = (side: SafeAreaProperty): number => {
  const insets = getSafeAreaInsets();
  const value = insets[side];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export const DEFAULT_WINDOW_TOP_OFFSET = DEFAULT_NAVBAR_HEIGHT + WINDOW_TOP_MARGIN;

export const measureWindowTopOffset = (): number => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const navbar = document.querySelector<HTMLElement>(NAVBAR_SELECTOR);
  if (!navbar) {
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const { height } = navbar.getBoundingClientRect();
  const measured = Number.isFinite(height) ? Math.ceil(height) : DEFAULT_NAVBAR_HEIGHT;
  return Math.max(measured + WINDOW_TOP_MARGIN, DEFAULT_WINDOW_TOP_OFFSET);
};

export const clampWindowTopPosition = (
  value: number | null | undefined,
  topOffset?: number,
): number => {
  const safeOffset = typeof topOffset === "number" ? topOffset : measureWindowTopOffset();
  if (typeof value !== "number" || Number.isNaN(value)) {
    return safeOffset;
  }
  return Math.max(value, safeOffset);
};

const parseDimension = (value: number | null | undefined): number => {
  if (typeof value !== "number") return 0;
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
};

const getViewportDimension = (
  dimension: number | undefined,
  fallback: "innerWidth" | "innerHeight",
): number => {
  if (typeof dimension === "number" && Number.isFinite(dimension)) {
    return dimension;
  }
  if (typeof window !== "undefined" && typeof window[fallback] === "number") {
    return window[fallback] as number;
  }
  return 0;
};

const parsePositionCoordinate = (value: number | null | undefined, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

export const clampWindowPositionWithinViewport = (
  position: PositionLike,
  dimensions: DimensionsLike,
  options: ClampViewportOptions = {},
): {
  x: number;
  y: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
} | null => {
  if (!position || typeof position !== "object") {
    return null;
  }

  const viewportWidth = getViewportDimension(options.viewportWidth, "innerWidth");
  const viewportHeight = getViewportDimension(options.viewportHeight, "innerHeight");
  const topOffset = typeof options.topOffset === "number"
    ? options.topOffset
    : measureWindowTopOffset();
  const bottomInset = typeof options.bottomInset === "number"
    ? Math.max(options.bottomInset, 0)
    : Math.max(0, measureSafeAreaInset("bottom"));

  if (!viewportWidth || !viewportHeight) {
    return {
      x: parsePositionCoordinate(position.x ?? null, 0),
      y: clampWindowTopPosition(position.y ?? null, topOffset),
      bounds: {
        minX: 0,
        maxX: 0,
        minY: topOffset,
        maxY: topOffset,
      },
    };
  }

  const width = dimensions && typeof dimensions === "object"
    ? parseDimension((dimensions as { width?: number }).width ?? (dimensions as DOMRectReadOnly).width)
    : 0;
  const height = dimensions && typeof dimensions === "object"
    ? parseDimension((dimensions as { height?: number }).height ?? (dimensions as DOMRectReadOnly).height)
    : 0;

  const horizontalSpace = Math.max(viewportWidth - width, 0);
  const availableVertical = Math.max(viewportHeight - topOffset - SNAP_BOTTOM_INSET - bottomInset, 0);
  const verticalSpace = Math.max(availableVertical - height, 0);

  const minX = 0;
  const maxX = horizontalSpace;
  const minY = topOffset;
  const maxY = topOffset + verticalSpace;

  const nextX = Math.min(Math.max(parsePositionCoordinate(position.x ?? null, 0), minX), maxX);
  const nextY = Math.min(
    Math.max(clampWindowTopPosition(position.y ?? null, topOffset), minY),
    maxY,
  );

  return {
    x: nextX,
    y: nextY,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
    },
  };
};

export const computeEdgeThreshold = (size: number): number => {
  if (!Number.isFinite(size) || size <= 0) {
    return EDGE_THRESHOLD_MIN;
  }
  return clamp(size * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);
};

export const percentOf = (value: number, total: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total === 0) {
    return 0;
  }
  return (value / total) * 100;
};

export const computeSnapRegions = (
  viewportWidth: number,
  viewportHeight: number,
  topInset: number = DEFAULT_WINDOW_TOP_OFFSET,
): SnapRegions => {
  const halfWidth = viewportWidth / 2;
  const normalizedTopInset = typeof topInset === "number"
    ? Math.max(topInset, DESKTOP_TOP_PADDING)
    : DEFAULT_WINDOW_TOP_OFFSET;
  const safeBottom = Math.max(0, measureSafeAreaInset("bottom"));
  const availableHeight = Math.max(0, viewportHeight - normalizedTopInset - SNAP_BOTTOM_INSET - safeBottom);
  const topHeight = Math.min(availableHeight, Math.max(viewportHeight / 2, 0));

  return {
    left: { left: 0, top: normalizedTopInset, width: halfWidth, height: availableHeight },
    right: { left: viewportWidth - halfWidth, top: normalizedTopInset, width: halfWidth, height: availableHeight },
    top: { left: 0, top: normalizedTopInset, width: viewportWidth, height: topHeight },
  };
};
