import { TextEncoder, TextDecoder } from 'util';
// Polyfill structuredClone before requiring modules that depend on it
// @ts-ignore
if (typeof global.structuredClone !== 'function') {
  // @ts-ignore
  global.structuredClone = (val) => (val === undefined ? val : JSON.parse(JSON.stringify(val)));
}
require('fake-indexeddb/auto');
import '@testing-library/jest-dom';

// Provide TextEncoder/TextDecoder for libraries that expect them in the test environment
// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder as any;

// Provide a minimal structuredClone polyfill for environments lacking it
// @ts-ignore
if (typeof global.structuredClone === 'undefined') {
  // @ts-ignore
  global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

// Ensure a global `fetch` exists for tests. Jest's jsdom environment
// doesn't provide one on the Node `global` object, which causes
// `jest.spyOn(global, 'fetch')` to fail. Providing a simple stub allows
// tests to spy on and mock `fetch` as needed.
// @ts-ignore
if (!global.fetch) {
  // @ts-ignore
  global.fetch = () => Promise.reject(new Error('fetch not implemented'));
}

// jsdom does not provide a global Image constructor which is used by
// some components (e.g. window borders). A minimal mock is sufficient
// for our tests because we only rely on the instance existing.
class ImageMock {
  constructor(width = 0, height = 0) {
    const img = document.createElement('img');
    img.width = width;
    img.height = height;
    return img;
  }
}

// @ts-ignore - allow overriding the global Image for the test env
global.Image = ImageMock as unknown as typeof Image;

// Provide a minimal canvas mock so libraries like xterm.js can run under JSDOM.
// In non-browser environments (like Jest's node environment) HTMLCanvasElement may
// not exist, so guard against it before patching the prototype.
if (typeof HTMLCanvasElement !== 'undefined') {
  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray() } as ImageData),
    putImageData: () => {},
    createImageData: () => new ImageData(0, 0),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    fillText: () => {},
    measureText: () => ({ width: 0 } as TextMetrics),
    transform: () => {},
    rect: () => {},
    clip: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} } as unknown as CanvasGradient),
  });
}

// Basic matchMedia mock for libraries that expect it
const globalScope = globalThis as typeof globalThis & {
  matchMedia?: (query: string) => MediaQueryList;
  IntersectionObserver?: typeof IntersectionObserver;
  localStorage?: Storage;
};

if (typeof globalScope.matchMedia !== 'function') {
  globalScope.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }) as unknown as typeof globalScope.matchMedia;
}

// Minimal IntersectionObserver mock so components relying on it don't crash in tests
if (!('IntersectionObserver' in globalScope)) {
  class IntersectionObserverMock {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  // @ts-ignore
  globalScope.IntersectionObserver = IntersectionObserverMock;
  // @ts-ignore
  global.IntersectionObserver = IntersectionObserverMock as any;
}

// jsdom does not implement scrollIntoView; provide a no-op stub so components
// depending on it do not fail during tests.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Simple localStorage mock for environments without it
if (!globalScope.localStorage) {
  const store: Record<string, string> = {};
  // @ts-ignore
  globalScope.localStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  } as Storage;
}

// Minimal Worker mock for tests with deterministic messaging
type WorkerListener = (event: { data: any }) => void;

class WorkerMock {
  static instances: WorkerMock[] = [];
  onmessage: WorkerListener | null = null;
  private listeners = new Set<WorkerListener>();

  constructor() {
    WorkerMock.instances.push(this);
  }

  private dispatch(payload: any) {
    const event = { data: payload };
    if (this.onmessage) this.onmessage(event);
    this.listeners.forEach((listener) => listener(event));
  }

  postMessage(data: any) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'start') {
      this.dispatch({ type: 'tick', delta: 1 / 60 });
    } else if (data.type === 'step') {
      const ms = typeof data.delta === 'number' ? data.delta : 16;
      this.dispatch({ type: 'tick', delta: ms / 1000 });
    }
  }

  terminate() {
    this.listeners.clear();
    this.onmessage = null;
    WorkerMock.instances = WorkerMock.instances.filter((instance) => instance !== this);
  }

  addEventListener(type: string, listener: WorkerListener) {
    if (type === 'message') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: WorkerListener) {
    if (type === 'message') this.listeners.delete(listener);
  }
}
// @ts-ignore
global.Worker = WorkerMock as any;
// @ts-ignore
global.__WorkerMock = WorkerMock;

// Mock xterm and addons so terminal tests run without the real library
jest.mock(
  '@xterm/xterm',
  () => ({
    Terminal: class {
      loadAddon() {}
      write() {}
      writeln() {}
      open() {}
      dispose() {}
      onKey() {}
      onData() {}
      get buffer() {
        return { active: { getLine: () => ({ translateToString: () => '' }) } };
      }
    },

  }),
  { virtual: true }
);

jest.mock(
  '@xterm/addon-fit',
  () => ({
    FitAddon: class {
      activate() {}
      dispose() {}
      fit() {}
    },

  }),
  { virtual: true }
);

jest.mock(
  '@xterm/addon-search',
  () => ({
    SearchAddon: class {
      activate() {}
      dispose() {}
    },

  }),
  { virtual: true }
);
