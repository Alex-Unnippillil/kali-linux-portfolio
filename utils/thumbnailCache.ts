export const THUMBNAIL_CACHE = 'thumbnail-cache';

export async function clearThumbnailCache() {
  if (typeof caches === 'undefined') return;
  await caches.delete(THUMBNAIL_CACHE);
}

export async function getThumbnailCacheSize(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const cache = await caches.open(THUMBNAIL_CACHE);
  const requests = await cache.keys();
  let total = 0;
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.clone().blob();
      total += blob.size;
    }
  }
  return total;
}
