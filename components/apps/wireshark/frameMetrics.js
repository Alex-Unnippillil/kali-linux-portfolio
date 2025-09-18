const GLOBAL_KEY = '__wiresharkFrameDeltas';
let lastTimestamp = null;

const ensureStore = () => {
  if (typeof window === 'undefined') return [];
  const store = window[GLOBAL_KEY];
  if (Array.isArray(store)) return store;
  const fresh = [];
  window[GLOBAL_KEY] = fresh;
  return fresh;
};

export const resetFrameMetrics = () => {
  lastTimestamp = null;
  if (typeof window !== 'undefined') {
    window[GLOBAL_KEY] = [];
  }
};

export const trackFrame = (callback) => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    callback(0);
    return 0;
  }
  return window.requestAnimationFrame((timestamp) => {
    const store = ensureStore();
    const delta = lastTimestamp === null ? 0 : timestamp - lastTimestamp;
    store.push(delta);
    lastTimestamp = timestamp;
    callback(timestamp);
  });
};

export const getFrameDeltas = () => {
  if (typeof window === 'undefined') return [];
  const store = window[GLOBAL_KEY];
  return Array.isArray(store) ? store : [];
};
