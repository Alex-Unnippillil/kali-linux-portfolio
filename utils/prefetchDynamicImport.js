const MAX_PREFETCH_BYTES = 200 * 1024; // 200KB threshold

function schedulePrefetch(fn) {
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn);
    } else {
      setTimeout(fn, 0);
    }
  }
}

export default function prefetchDynamicImport(prefetchFn, url) {
  if (typeof prefetchFn !== 'function') return;

  if (!url || typeof fetch !== 'function') {
    schedulePrefetch(prefetchFn);
    return;
  }

  fetch(url, { method: 'HEAD' })
    .then((res) => {
      const len = parseInt(res.headers.get('content-length') || '0', 10);
      if (len && len > MAX_PREFETCH_BYTES) return;
      schedulePrefetch(prefetchFn);
    })
    .catch(() => {
      schedulePrefetch(prefetchFn);
    });
}
