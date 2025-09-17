const FRAME_BUDGET_MS = 16;

export type ResizeDimensions = {
  width: number;
  height: number;
};

export type ResizeCallback = (size: ResizeDimensions) => void;

export interface SubscribeOptions {
  /**
   * Whether to invoke the callback immediately with the latest known size.
   * Defaults to true to preserve legacy behaviour where listeners performed an
   * eager measurement on subscription.
   */
  immediate?: boolean;
}

interface FrameHandle {
  id: number;
  raf: boolean;
}

const runtimeWindow: (Window & typeof globalThis) | undefined =
  typeof globalThis === 'object' && globalThis !== null &&
  'addEventListener' in globalThis &&
  typeof (globalThis as Window & typeof globalThis).addEventListener === 'function'
    ? (globalThis as Window & typeof globalThis)
    : undefined;

const windowSubscribers = new Set<ResizeCallback>();
let windowFrame: FrameHandle | null = null;
let lastWindowSize: ResizeDimensions | null = null;

const panelSubscribers = new Set<ResizeCallback>();
let panelElement: HTMLElement | null = null;
let panelObserver: ResizeObserver | null = null;
let panelFrame: FrameHandle | null = null;
let lastPanelSize: ResizeDimensions | null = null;

function requestFrame(callback: () => void): FrameHandle | null {
  if (!runtimeWindow) return null;
  if (typeof runtimeWindow.requestAnimationFrame === 'function') {
    const id = runtimeWindow.requestAnimationFrame(() => callback());
    return { id, raf: true };
  }
  const id = runtimeWindow.setTimeout(callback, FRAME_BUDGET_MS);
  return { id, raf: false };
}

function cancelFrame(handle: FrameHandle | null) {
  if (!handle || !runtimeWindow) return;
  if (handle.raf && typeof runtimeWindow.cancelAnimationFrame === 'function') {
    runtimeWindow.cancelAnimationFrame(handle.id);
  } else {
    runtimeWindow.clearTimeout(handle.id);
  }
}

function measureWindow(): ResizeDimensions | null {
  if (!runtimeWindow) return null;
  return { width: runtimeWindow.innerWidth, height: runtimeWindow.innerHeight };
}

function measurePanel(): ResizeDimensions | null {
  if (!panelElement) return null;
  const rect = panelElement.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function emit(target: 'window' | 'panel') {
  if (target === 'window') {
    if (!lastWindowSize) lastWindowSize = measureWindow();
    if (!lastWindowSize) return;
    windowSubscribers.forEach((cb) => cb(lastWindowSize as ResizeDimensions));
    return;
  }
  if (!lastPanelSize) lastPanelSize = measurePanel();
  if (!lastPanelSize) return;
  panelSubscribers.forEach((cb) => cb(lastPanelSize as ResizeDimensions));
}

function scheduleWindowEmit() {
  if (windowFrame || windowSubscribers.size === 0) return;
  windowFrame = requestFrame(() => {
    windowFrame = null;
    emit('window');
  });
}

function schedulePanelEmit() {
  if (panelFrame || panelSubscribers.size === 0) return;
  panelFrame = requestFrame(() => {
    panelFrame = null;
    emit('panel');
  });
}

function handleWindowResize() {
  lastWindowSize = measureWindow();
  scheduleWindowEmit();
  if (!panelElement || (runtimeWindow && typeof runtimeWindow.ResizeObserver === 'function')) return;
  lastPanelSize = measurePanel();
  schedulePanelEmit();
}

function handlePanelResize(entries: ResizeObserverEntry[]) {
  if (!entries.length) return;
  const entry = entries[entries.length - 1];
  const box = Array.isArray(entry.borderBoxSize)
    ? entry.borderBoxSize[entry.borderBoxSize.length - 1]
    : (entry.borderBoxSize as ResizeObserverSize | undefined);
  if (box && typeof box.inlineSize === 'number' && typeof box.blockSize === 'number') {
    lastPanelSize = { width: box.inlineSize, height: box.blockSize };
  } else {
    const { width, height } = entry.contentRect;
    lastPanelSize = { width, height };
  }
  schedulePanelEmit();
}

function ensureWindowListener() {
  if (!runtimeWindow || windowSubscribers.size !== 1) return;
  runtimeWindow.addEventListener('resize', handleWindowResize, { passive: true });
  lastWindowSize = measureWindow();
}

function teardownWindowListener() {
  if (!runtimeWindow || windowSubscribers.size !== 0) return;
  runtimeWindow.removeEventListener('resize', handleWindowResize);
  cancelFrame(windowFrame);
  windowFrame = null;
}

function ensurePanelObserver() {
  if (!runtimeWindow || panelSubscribers.size === 0) return;
  if (!panelElement) return;
  if (typeof runtimeWindow.ResizeObserver === 'function') {
    panelObserver?.disconnect();
    panelObserver = new runtimeWindow.ResizeObserver(handlePanelResize);
    panelObserver.observe(panelElement);
    lastPanelSize = measurePanel();
    schedulePanelEmit();
    return;
  }
  // Fallback: rely on window resize events when ResizeObserver unavailable
  if (!lastPanelSize) lastPanelSize = measurePanel();
  schedulePanelEmit();
}

function teardownPanelObserver() {
  if (!runtimeWindow || panelSubscribers.size !== 0) return;
  panelObserver?.disconnect();
  panelObserver = null;
  cancelFrame(panelFrame);
  panelFrame = null;
}

export function onWindowResize(
  callback: ResizeCallback,
  options: SubscribeOptions = {},
): () => void {
  if (!runtimeWindow) return () => undefined;
  windowSubscribers.add(callback);
  ensureWindowListener();
  const { immediate = true } = options;
  if (immediate) {
    if (!lastWindowSize) lastWindowSize = measureWindow();
    if (lastWindowSize) callback(lastWindowSize);
  }
  return () => {
    windowSubscribers.delete(callback);
    if (windowSubscribers.size === 0) {
      teardownWindowListener();
    }
  };
}

export function onPanelResize(
  callback: ResizeCallback,
  options: SubscribeOptions = {},
): () => void {
  if (!runtimeWindow) return () => undefined;
  panelSubscribers.add(callback);
  ensurePanelObserver();
  const { immediate = true } = options;
  if (immediate) {
    if (!lastPanelSize) lastPanelSize = measurePanel();
    if (lastPanelSize) callback(lastPanelSize);
  }
  return () => {
    panelSubscribers.delete(callback);
    if (panelSubscribers.size === 0) {
      teardownPanelObserver();
    }
  };
}

export function setPanelResizeTarget(element: HTMLElement | null) {
  if (!runtimeWindow) return;
  if (panelObserver) {
    panelObserver.disconnect();
    panelObserver = null;
  }
  panelElement = element;
  lastPanelSize = element ? measurePanel() : null;
  if (!panelElement) {
    cancelFrame(panelFrame);
    panelFrame = null;
    return;
  }
  if (panelSubscribers.size > 0) {
    ensurePanelObserver();
  }
}

export function getWindowSize(): ResizeDimensions | null {
  if (!lastWindowSize) lastWindowSize = measureWindow();
  return lastWindowSize;
}

export function getPanelSize(): ResizeDimensions | null {
  if (!lastPanelSize) lastPanelSize = measurePanel();
  return lastPanelSize;
}
