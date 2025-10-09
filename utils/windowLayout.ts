import { NAVBAR_HEIGHT, SNAP_BOTTOM_INSET } from './uiConstants';

const NAVBAR_SELECTOR = '.main-navbar-vp';
const NAVBAR_VERTICAL_PADDING = 16; // 0.5rem top + 0.5rem bottom
const DEFAULT_NAVBAR_HEIGHT = NAVBAR_HEIGHT + NAVBAR_VERTICAL_PADDING;
const WINDOW_TOP_MARGIN = 8;

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type SafeAreaSide = keyof SafeAreaInsets;

const SAFE_AREA_PROPERTIES: Record<SafeAreaSide, string> = {
  top: '--safe-area-top',
  right: '--safe-area-right',
  bottom: '--safe-area-bottom',
  left: '--safe-area-left',
};

const parseSafeAreaValue = (value: string | null | undefined): number => {
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readSafeAreaInset = (
  computed: CSSStyleDeclaration | null | undefined,
  property: string,
): number => {
  if (!computed || typeof computed.getPropertyValue !== 'function') return 0;
  return parseSafeAreaValue(computed.getPropertyValue(property));
};

export const getSafeAreaInsets = (): SafeAreaInsets => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
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

export const measureSafeAreaInset = (side: SafeAreaSide): number => {
  const insets = getSafeAreaInsets();
  const value = insets[side];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const DEFAULT_WINDOW_TOP_OFFSET = DEFAULT_NAVBAR_HEIGHT + WINDOW_TOP_MARGIN;

export const measureWindowTopOffset = (): number => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const navbar = document.querySelector<HTMLElement>(NAVBAR_SELECTOR);
  if (!navbar || typeof navbar.getBoundingClientRect !== 'function') {
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
  const safeOffset = typeof topOffset === 'number' && Number.isFinite(topOffset)
    ? topOffset
    : measureWindowTopOffset();

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return safeOffset;
  }

  return Math.max(value, safeOffset);
};

const parseDimension = (value: unknown): number => {
  if (typeof value !== 'number') return 0;
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
};

type ViewportFallback = 'innerWidth' | 'innerHeight';

const getViewportDimension = (
  dimension: number | undefined,
  fallback: ViewportFallback,
): number => {
  if (typeof dimension === 'number' && Number.isFinite(dimension)) {
    return dimension;
  }

  if (typeof window !== 'undefined') {
    const fallbackValue = (window as unknown as Record<ViewportFallback, unknown>)[fallback];
    if (typeof fallbackValue === 'number' && Number.isFinite(fallbackValue)) {
      return fallbackValue;
    }
  }

  return 0;
};

const parsePositionCoordinate = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowDimensions {
  width: number;
  height: number;
}

export interface WindowBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface WindowClampOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  topOffset?: number;
  bottomInset?: number;
}

export interface ClampedWindowPosition extends WindowPosition {
  bounds: WindowBounds;
}

type DimensionsLike = Partial<WindowDimensions>;

const extractDimension = (
  dimensions: DimensionsLike | DOMRect | DOMRectReadOnly | null | undefined,
  key: 'width' | 'height',
): number => {
  if (!dimensions || typeof dimensions !== 'object') {
    return 0;
  }

  if (key in dimensions) {
    const dimensionValue = (dimensions as Record<'width' | 'height', unknown>)[key];
    return parseDimension(dimensionValue);
  }

  return 0;
};

export const clampWindowPositionWithinViewport = (
  position: WindowPosition | null | undefined,
  dimensions: DimensionsLike | DOMRect | DOMRectReadOnly | null | undefined,
  options: WindowClampOptions = {},
): ClampedWindowPosition | null => {
  if (!position || typeof position !== 'object') {
    return null;
  }

  const viewportWidth = getViewportDimension(options.viewportWidth, 'innerWidth');
  const viewportHeight = getViewportDimension(options.viewportHeight, 'innerHeight');
  const topOffset = typeof options.topOffset === 'number' && Number.isFinite(options.topOffset)
    ? options.topOffset
    : measureWindowTopOffset();
  const bottomInset = typeof options.bottomInset === 'number' && Number.isFinite(options.bottomInset)
    ? Math.max(options.bottomInset, 0)
    : Math.max(0, measureSafeAreaInset('bottom'));

  if (!viewportWidth || !viewportHeight) {
    const clampedY = clampWindowTopPosition(position.y, topOffset);
    return {
      x: parsePositionCoordinate(position.x, 0),
      y: clampedY,
      bounds: {
        minX: 0,
        maxX: 0,
        minY: topOffset,
        maxY: topOffset,
      },
    };
  }

  const width = extractDimension(dimensions, 'width');
  const height = extractDimension(dimensions, 'height');

  const horizontalSpace = Math.max(viewportWidth - width, 0);
  const availableVertical = Math.max(viewportHeight - topOffset - SNAP_BOTTOM_INSET - bottomInset, 0);
  const verticalSpace = Math.max(availableVertical - height, 0);

  const minX = 0;
  const maxX = horizontalSpace;
  const minY = topOffset;
  const maxY = topOffset + verticalSpace;

  const nextX = Math.min(Math.max(parsePositionCoordinate(position.x, 0), minX), maxX);
  const nextY = Math.min(
    Math.max(clampWindowTopPosition(position.y, topOffset), minY),
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
