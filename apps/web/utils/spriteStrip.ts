const stripCache: Record<string, HTMLImageElement> = {};

/**
 * Imports a sprite strip image and caches it for reuse.
 * @param src image source path
 * @returns the loaded HTMLImageElement
 */
export const importSpriteStrip = (src: string): HTMLImageElement => {
  if (!stripCache[src]) {
    const img = new Image();
    img.src = src;
    stripCache[src] = img;
  }
  return stripCache[src];
};

/**
 * Clears the sprite strip cache. Useful for testing.
 */
export const clearSpriteStripCache = () => {
  Object.keys(stripCache).forEach((k) => delete stripCache[k]);
};
