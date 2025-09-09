interface StripResource {
  /** Object URL used for rendering */
  url: string;
  /** Decoded bitmap for cleanup */
  bitmap: ImageBitmap | HTMLImageElement;
  /** Release underlying resources */
  release: () => void;
}

const stripCache: Record<string, Promise<StripResource>> = {};

/**
 * Imports a sprite strip image and caches it for reuse.
 * @param src image source path
 * @returns a promise resolving to the decoded strip resource
 */
export const importSpriteStrip = (src: string): Promise<StripResource> => {
  if (!stripCache[src]) {
    if (typeof fetch === 'undefined' || typeof createImageBitmap === 'undefined') {
      // Fallback for non-browser environments (e.g. tests)
      stripCache[src] = Promise.resolve({
        url: src,
        bitmap: Object.assign(new Image(), { src }) as HTMLImageElement,
        release: () => {
          delete stripCache[src];
        },
      });
    } else {
      stripCache[src] = fetch(src)
        .then((r) => r.blob())
        .then(async (blob) => {
          const bitmap = await createImageBitmap(blob);
          const url = URL.createObjectURL(blob);
          return {
            url,
            bitmap,
            release: () => {
              bitmap.close?.();
              URL.revokeObjectURL(url);
              delete stripCache[src];
            },
          } as StripResource;
        });
    }
  }
  return stripCache[src];
};

/**
 * Clears the sprite strip cache. Useful for testing.
 */
export const clearSpriteStripCache = () => {
  Object.keys(stripCache).forEach((k) => {
    stripCache[k]?.then((res) => res.release());
    delete stripCache[k];
  });
};

/**
 * Returns current number of cached strips. Mainly for testing.
 */
export const stripCacheSize = () => Object.keys(stripCache).length;
