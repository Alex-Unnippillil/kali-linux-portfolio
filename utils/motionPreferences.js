const WINDOW_MOTION_DEFAULTS = Object.freeze({
  minimize: 200,
  restore: 300,
  snap: 240,
  maximize: 320,
});

let reduceMotionQuery;

function getReduceMotionQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  if (!reduceMotionQuery) {
    reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }

  return reduceMotionQuery;
}

function hasReducedMotionClass() {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return Boolean(root && root.classList && root.classList.contains('reduced-motion'));
}

export function isReducedMotionEnabled() {
  const query = getReduceMotionQuery();
  return hasReducedMotionClass() || Boolean(query && query.matches);
}

export function getMotionDuration(duration, options = {}) {
  const { reducedMotion } = options || {};
  const shouldReduce =
    typeof reducedMotion === 'boolean' ? reducedMotion : isReducedMotionEnabled();

  if (!duration || shouldReduce) {
    return 0;
  }

  return duration;
}

export function getWindowMotionDuration(preset, options = {}) {
  const baseDuration =
    WINDOW_MOTION_DEFAULTS[preset] ?? WINDOW_MOTION_DEFAULTS.restore;
  return getMotionDuration(baseDuration, options);
}
