export type PlacementMode = 'smart' | 'center';

export interface Point { x: number; y: number; }

const CASCADE_OFFSET = 28;

/**
 * Compute placement for a new window.
 * @param mode placement policy for the first window.
 * @param size window size in percentages of viewport (0-100).
 * @param viewport viewport size in pixels.
 * @param last last window position if any (for cascading).
 */
export function computePlacement(
  mode: PlacementMode,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  last: Point | null,
): Point {
  const widthPx = (size.width / 100) * viewport.width;
  const heightPx = (size.height / 100) * viewport.height;

  if (last) {
    // Cascade from the last window position
    const maxX = viewport.width - widthPx - CASCADE_OFFSET;
    const maxY = viewport.height - heightPx - CASCADE_OFFSET;
    return {
      x: Math.max(0, Math.min(last.x + CASCADE_OFFSET, maxX)),
      y: Math.max(0, Math.min(last.y + CASCADE_OFFSET, maxY)),
    };
  }

  if (mode === 'center') {
    return {
      x: Math.round((viewport.width - widthPx) / 2),
      y: Math.round((viewport.height - heightPx) / 2),
    };
  }

  // smart: start near top-left while keeping window fully visible
  const startX = Math.min(60, viewport.width - widthPx - CASCADE_OFFSET);
  const startY = Math.min(10, viewport.height - heightPx - CASCADE_OFFSET);
  return { x: Math.max(0, startX), y: Math.max(0, startY) };
}

export default computePlacement;
