export type SnapPosition = 'left' | 'right' | 'top';

export interface SnapPreview {
  left: string;
  top: string;
  width: string;
  height: string;
}

export interface SnapResult {
  preview: SnapPreview | null;
  position: SnapPosition | null;
}

/**
 * Calculate snap preview and position for a window.
 *
 * @param rect - Bounding rectangle of the draggable window
 * @param threshold - Distance from viewport edge in pixels to trigger snap
 * @param viewportWidth - Width of the viewport (window.innerWidth)
 */
export function getSnap(
  rect: DOMRect,
  threshold: number,
  viewportWidth: number = typeof window !== 'undefined' ? window.innerWidth : 0
): SnapResult {
  let preview: SnapPreview | null = null;
  let position: SnapPosition | null = null;

  if (rect.left <= threshold) {
    preview = { left: '0', top: '0', width: '50%', height: '100%' };
    position = 'left';
  } else if (rect.right >= viewportWidth - threshold) {
    preview = { left: '50%', top: '0', width: '50%', height: '100%' };
    position = 'right';
  } else if (rect.top <= threshold) {
    preview = { left: '0', top: '0', width: '100%', height: '50%' };
    position = 'top';
  }

  return { preview, position };
}
