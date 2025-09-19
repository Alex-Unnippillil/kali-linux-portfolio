const DURATION_PATTERN = /(-?\d*\.?\d+)(ms|s)/i;

const parseDuration = (value: string | null | undefined, fallback: number): number => {
  if (!value) return fallback;
  const match = value.trim().match(DURATION_PATTERN);
  if (!match) return fallback;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return fallback;
  return match[2].toLowerCase() === 's' ? numeric * 1000 : numeric;
};

export const getMotionDuration = (
  tokenName: string,
  fallback: number,
): number => {
  if (typeof window === 'undefined') return fallback;
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(tokenName);
  return parseDuration(value, fallback);
};

export const getMotionCap = (): number =>
  getMotionDuration('--motion-duration-cap', 100);

export const shouldDisableTransitions = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cap = getMotionCap();
  return cap <= 0;
};

export { parseDuration };
