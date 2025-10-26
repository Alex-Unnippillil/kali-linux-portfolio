export type ViewportCallback = (entry: IntersectionObserverEntry) => void;
export type ViewportUnsubscribe = () => void;

type RootType = Element | Document | null | undefined;

interface SharedObserver {
  observer: IntersectionObserver;
  targets: Map<Element, Set<ViewportCallback>>;
}

const defaultRootObservers = new Map<string, SharedObserver>();
const rootObservers = new WeakMap<Element | Document, Map<string, SharedObserver>>();
const noop: ViewportUnsubscribe = () => {};

function getObserverKey(options?: IntersectionObserverInit) {
  const rootMargin = options?.rootMargin ?? '0px';
  const threshold = options?.threshold ?? 0;
  const thresholdKey = Array.isArray(threshold) ? threshold.join(',') : `${threshold}`;
  return `${rootMargin}|${thresholdKey}`;
}

function getRootObserverMap(root: RootType) {
  if (root == null) {
    return defaultRootObservers;
  }

  let map = rootObservers.get(root);
  if (!map) {
    map = new Map<string, SharedObserver>();
    rootObservers.set(root, map);
  }
  return map;
}

function createSharedObserver(root: RootType, options?: IntersectionObserverInit): SharedObserver {
  const targets = new Map<Element, Set<ViewportCallback>>();

  const observerOptions: IntersectionObserverInit = {
    root: (root ?? null) as Element | Document | null,
  };

  if (options?.rootMargin !== undefined) {
    observerOptions.rootMargin = options.rootMargin;
  }
  if (options?.threshold !== undefined) {
    observerOptions.threshold = options.threshold;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const callbacks = targets.get(entry.target as Element);
      if (!callbacks || callbacks.size === 0) {
        return;
      }

      const handlers = Array.from(callbacks);
      handlers.forEach((handler) => handler(entry));
    });
  }, observerOptions);

  return { observer, targets };
}

function cleanupSharedObserver(
  root: RootType,
  key: string,
  map: Map<string, SharedObserver>,
  shared: SharedObserver,
) {
  if (shared.targets.size === 0) {
    shared.observer.disconnect();
    map.delete(key);
    if (root != null && map.size === 0) {
      rootObservers.delete(root);
    }
  }
}

function createFallbackEntry(target: Element): IntersectionObserverEntry {
  const rect = typeof target.getBoundingClientRect === 'function'
    ? target.getBoundingClientRect()
    : ({} as DOMRectReadOnly);

  const time = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

  return {
    isIntersecting: true,
    target,
    intersectionRatio: 1,
    time,
    boundingClientRect: rect,
    intersectionRect: rect,
    rootBounds: null,
  } as IntersectionObserverEntry;
}

export function observeViewport(
  target: Element | null | undefined,
  callback: ViewportCallback,
  options?: IntersectionObserverInit,
): ViewportUnsubscribe {
  if (!target) {
    return noop;
  }

  if (typeof IntersectionObserver === 'undefined') {
    callback(createFallbackEntry(target));
    return noop;
  }

  const key = getObserverKey(options);
  const root = options?.root ?? null;
  const map = getRootObserverMap(root);
  let shared = map.get(key);
  if (!shared) {
    shared = createSharedObserver(root, options);
    map.set(key, shared);
  }

  let targetCallbacks = shared.targets.get(target);
  if (!targetCallbacks) {
    targetCallbacks = new Set<ViewportCallback>();
    shared.targets.set(target, targetCallbacks);
    shared.observer.observe(target);
  }

  targetCallbacks.add(callback);
  const sharedObserver = shared;
  const callbacksRef = targetCallbacks;

  let active = true;
  return () => {
    if (!active) {
      return;
    }
    active = false;
    callbacksRef.delete(callback);
    if (callbacksRef.size === 0) {
      sharedObserver.observer.unobserve(target);
      sharedObserver.targets.delete(target);
      cleanupSharedObserver(root, key, map, sharedObserver);
    }
  };
}
