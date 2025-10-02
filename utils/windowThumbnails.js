const cache = new Map();
const listeners = new Map();
const pendingCaptures = new Map();

const getWindowObject = () => (typeof window !== 'undefined' ? window : null);

const requestIdle = (cb) => {
  const win = getWindowObject();
  if (!win) return null;
  if (typeof win.requestIdleCallback === 'function') {
    return win.requestIdleCallback(cb, { timeout: 1000 });
  }
  return win.setTimeout(() => {
    cb({ didTimeout: false, timeRemaining: () => 0 });
  }, 120);
};

const cancelIdle = (handle) => {
  const win = getWindowObject();
  if (!win || handle == null) return;
  if (typeof win.cancelIdleCallback === 'function') {
    win.cancelIdleCallback(handle);
  } else {
    win.clearTimeout(handle);
  }
};

const disposeBitmap = (entry) => {
  if (entry && entry.bitmap && typeof entry.bitmap.close === 'function') {
    try {
      entry.bitmap.close();
    } catch (e) {
      // ignore
    }
  }
};

const notify = (id) => {
  const callbacks = listeners.get(id);
  if (!callbacks) return;
  const snapshot = cache.get(id) || null;
  callbacks.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (e) {
      // ignore listener errors
    }
  });
};

const MAX_DIMENSION = 320;

export const getWindowThumbnail = (id) => cache.get(id) || null;

export const subscribeWindowThumbnail = (id, callback) => {
  if (!listeners.has(id)) {
    listeners.set(id, new Set());
  }
  const callbacks = listeners.get(id);
  callbacks.add(callback);
  return () => {
    const current = listeners.get(id);
    if (!current) return;
    current.delete(callback);
    if (current.size === 0) {
      listeners.delete(id);
    }
  };
};

const scheduleCapture = (id, element, force = false) => {
  if (!element || typeof element !== 'object') return;
  const win = getWindowObject();
  if (!win) return;
  if (pendingCaptures.has(id)) {
    cancelIdle(pendingCaptures.get(id));
    pendingCaptures.delete(id);
  }
  const handle = requestIdle(async () => {
    pendingCaptures.delete(id);
    if (!element.isConnected) return;
    if (typeof element.getBoundingClientRect === 'function') {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
    }
    const existing = cache.get(id);
    if (existing && !force && !existing.stale) {
      return;
    }
    try {
      const { toCanvas } = await import('html-to-image');
      const pixelRatio = Math.min(win.devicePixelRatio || 1, 1.5);
      const baseCanvas = await toCanvas(element, {
        cacheBust: false,
        skipFonts: false,
        pixelRatio,
      });
      const width = baseCanvas.width;
      const height = baseCanvas.height;
      if (!width || !height) {
        return;
      }
      const maxSourceDimension = Math.max(width, height);
      const scale = maxSourceDimension > MAX_DIMENSION
        ? MAX_DIMENSION / maxSourceDimension
        : 1;
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      let bitmapSource = baseCanvas;
      if (scale !== 1) {
        const doc = win.document;
        if (!doc) {
          return;
        }
        const scaledCanvas = doc.createElement('canvas');
        scaledCanvas.width = targetWidth;
        scaledCanvas.height = targetHeight;
        const ctx = scaledCanvas.getContext('2d');
        if (!ctx) {
          return;
        }
        ctx.drawImage(baseCanvas, 0, 0, targetWidth, targetHeight);
        bitmapSource = scaledCanvas;
      }
      if (typeof win.createImageBitmap !== 'function') {
        return;
      }
      const bitmap = await win.createImageBitmap(bitmapSource, 0, 0, targetWidth, targetHeight);
      const entry = {
        bitmap,
        width: targetWidth,
        height: targetHeight,
        updatedAt: Date.now(),
        stale: false,
      };
      if (existing) {
        disposeBitmap(existing);
      }
      cache.set(id, entry);
      notify(id);
    } catch (error) {
      // ignore capture errors
    }
  });
  if (handle != null) {
    pendingCaptures.set(id, handle);
  }
};

export const queueWindowThumbnailCapture = (id, element, options = {}) => {
  if (!id || !element) return;
  scheduleCapture(id, element, options.force === true);
};

export const invalidateWindowThumbnail = (id) => {
  if (!id) return;
  const entry = cache.get(id);
  if (entry) {
    entry.stale = true;
    cache.set(id, entry);
    notify(id);
  }
};

export const removeWindowThumbnail = (id) => {
  if (!id) return;
  const existing = cache.get(id);
  if (existing) {
    disposeBitmap(existing);
    cache.delete(id);
    notify(id);
  }
  if (pendingCaptures.has(id)) {
    cancelIdle(pendingCaptures.get(id));
    pendingCaptures.delete(id);
  }
};

export const ensureWindowThumbnail = (id) => {
  if (!id) return;
  if (cache.has(id) && !cache.get(id)?.stale) {
    return;
  }
  const win = getWindowObject();
  if (!win) return;
  const element = win.document ? win.document.getElementById(id) : null;
  if (element) {
    scheduleCapture(id, element, true);
  }
};

export const clearWindowThumbnails = () => {
  Array.from(cache.keys()).forEach((id) => removeWindowThumbnail(id));
};
