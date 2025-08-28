export type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export const SWIPE_THRESHOLD = 30;

export const detectSwipe = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  threshold: number = SWIPE_THRESHOLD
): Direction | null => {
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'ArrowRight' : 'ArrowLeft';
  }
  return dy > 0 ? 'ArrowDown' : 'ArrowUp';
};
