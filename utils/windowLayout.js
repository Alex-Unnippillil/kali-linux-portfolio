const NAVBAR_SELECTOR = '.main-navbar-vp';
const DEFAULT_NAVBAR_HEIGHT = 48;
const WINDOW_TOP_MARGIN = 16;
const SAFE_AREA_PROPERTIES = {
  top: '--safe-area-top',
  right: '--safe-area-right',
  bottom: '--safe-area-bottom',
  left: '--safe-area-left',
};

const parseSafeAreaValue = (value) => {
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readSafeAreaInset = (computed, property) => {
  if (!computed || typeof computed.getPropertyValue !== 'function') return 0;
  return parseSafeAreaValue(computed.getPropertyValue(property));
};

export const getSafeAreaInsets = () => {
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

export const measureSafeAreaInset = (side) => {
  const insets = getSafeAreaInsets();
  if (!insets || typeof insets !== 'object') return 0;
  const value = insets[side];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const DEFAULT_WINDOW_TOP_OFFSET = DEFAULT_NAVBAR_HEIGHT + WINDOW_TOP_MARGIN;

export const measureWindowTopOffset = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const navbar = document.querySelector(NAVBAR_SELECTOR);
  if (!navbar) {
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const { height } = navbar.getBoundingClientRect();
  const measured = Number.isFinite(height) ? Math.ceil(height) : DEFAULT_NAVBAR_HEIGHT;
  return Math.max(measured + WINDOW_TOP_MARGIN, DEFAULT_WINDOW_TOP_OFFSET);
};

export const clampWindowTopPosition = (value, topOffset) => {
  const safeOffset = typeof topOffset === 'number' ? topOffset : measureWindowTopOffset();
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return safeOffset;
  }
  return Math.max(value, safeOffset);
};
