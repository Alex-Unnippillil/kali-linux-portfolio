// Phones use full-work-area windows, including touch landscape. Tablets retain movable windows.
export function isCompactWindowViewport(width, height, coarse = false) {
  return width > 0 && (width < 640 || (coarse && width < 1024 && height < 500));
}
export function compactWindowBounds(viewport, topInset, bottomInset, safe = {}) {
  const left = Math.max(0, safe.left || 0);
  const right = Math.max(0, safe.right || 0);
  return {
    x: viewport.left + left,
    y: viewport.top + topInset,
    width: Math.max(0, viewport.width - left - right),
    height: Math.max(0, viewport.height - topInset - bottomInset),
  };
}
