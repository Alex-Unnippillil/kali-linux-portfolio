const NAVBAR_SELECTOR = '.main-navbar-vp';
const DEFAULT_NAVBAR_HEIGHT = 48;
const WINDOW_TOP_MARGIN = 16;

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
