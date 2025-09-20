export const DEFAULT_MS_PER_PIXEL = 60_000; // 1 minute per pixel
export const MIN_MS_PER_PIXEL = 50; // 50 milliseconds per pixel when fully zoomed in
export const MAX_MS_PER_PIXEL = 2_592_000_000; // 30 days per pixel when fully zoomed out

export interface TimelineState {
  msPerPixel: number;
  offsetMs: number;
  viewportWidth: number;
  activeCategoryIds: string[];
  hasInteracted: boolean;
}

export type TimelineAction =
  | { type: 'SET_ACTIVE_CATEGORIES'; categoryIds: string[]; totalDurationMs: number }
  | { type: 'SET_VIEWPORT_WIDTH'; width: number; totalDurationMs: number }
  | { type: 'PAN'; deltaMs: number; totalDurationMs: number }
  | {
      type: 'ZOOM_BY_FACTOR';
      factor: number;
      focusRatio?: number;
      totalDurationMs: number;
    }
  | { type: 'AUTO_FIT'; totalDurationMs: number }
  | { type: 'RESET'; totalDurationMs: number };

const normalizeCategoryIds = (categoryIds: string[]): string[] => [
  ...new Set(categoryIds),
];

const clampMsPerPixel = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_MS_PER_PIXEL;
  }
  return Math.min(MAX_MS_PER_PIXEL, Math.max(MIN_MS_PER_PIXEL, value));
};

const clampOffset = (
  offsetMs: number,
  totalDurationMs: number,
  viewportMs: number
): number => {
  if (!Number.isFinite(offsetMs)) {
    return 0;
  }
  const safeViewport = Math.max(1, viewportMs);
  const maxOffset = Math.max(0, totalDurationMs - safeViewport);
  if (maxOffset === 0) {
    return 0;
  }
  return Math.min(Math.max(0, offsetMs), maxOffset);
};

export const createInitialTimelineState = (
  categoryIds: string[]
): TimelineState => ({
  msPerPixel: DEFAULT_MS_PER_PIXEL,
  offsetMs: 0,
  viewportWidth: 0,
  activeCategoryIds: normalizeCategoryIds(categoryIds),
  hasInteracted: false,
});

export const timelineReducer = (
  state: TimelineState,
  action: TimelineAction
): TimelineState => {
  switch (action.type) {
    case 'SET_ACTIVE_CATEGORIES': {
      const viewportMs = state.msPerPixel * Math.max(1, state.viewportWidth);
      return {
        ...state,
        activeCategoryIds: normalizeCategoryIds(action.categoryIds),
        offsetMs: clampOffset(0, action.totalDurationMs, viewportMs),
        hasInteracted: false,
      };
    }
    case 'SET_VIEWPORT_WIDTH': {
      const width = Math.max(0, action.width);
      const viewportMs = state.msPerPixel * Math.max(1, width);
      return {
        ...state,
        viewportWidth: width,
        offsetMs: clampOffset(state.offsetMs, action.totalDurationMs, viewportMs),
      };
    }
    case 'PAN': {
      const viewportMs = state.msPerPixel * Math.max(1, state.viewportWidth);
      return {
        ...state,
        offsetMs: clampOffset(
          state.offsetMs + action.deltaMs,
          action.totalDurationMs,
          viewportMs
        ),
        hasInteracted: true,
      };
    }
    case 'ZOOM_BY_FACTOR': {
      const factor = Number.isFinite(action.factor) && action.factor > 0 ? action.factor : 1;
      const width = Math.max(1, state.viewportWidth);
      const viewportMs = state.msPerPixel * width;
      const nextMsPerPixel = clampMsPerPixel(state.msPerPixel / factor);
      const nextViewportMs = nextMsPerPixel * width;
      const focusRatio = Math.min(
        1,
        Math.max(0, action.focusRatio ?? 0.5)
      );
      const focusPoint = state.offsetMs + focusRatio * viewportMs;
      return {
        ...state,
        msPerPixel: nextMsPerPixel,
        offsetMs: clampOffset(
          focusPoint - focusRatio * nextViewportMs,
          action.totalDurationMs,
          nextViewportMs
        ),
        hasInteracted: true,
      };
    }
    case 'AUTO_FIT': {
      if (state.viewportWidth <= 0) {
        return state;
      }
      const target = clampMsPerPixel(
        action.totalDurationMs / Math.max(1, state.viewportWidth)
      );
      return {
        ...state,
        msPerPixel: target,
        offsetMs: 0,
        hasInteracted: false,
      };
    }
    case 'RESET':
      return {
        ...state,
        msPerPixel: DEFAULT_MS_PER_PIXEL,
        offsetMs: 0,
        hasInteracted: false,
      };
    default:
      return state;
  }
};
