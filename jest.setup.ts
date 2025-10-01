import { TextEncoder, TextDecoder } from 'util';
// Polyfill structuredClone before requiring modules that depend on it
// @ts-ignore
if (typeof global.structuredClone !== 'function') {
  // @ts-ignore
  global.structuredClone = (val) => (val === undefined ? val : JSON.parse(JSON.stringify(val)));
}
const globalScope: any = typeof globalThis !== 'undefined' ? globalThis : {};

if (typeof (global as any).BroadcastChannel === 'undefined') {
  const channels = new Map<string, Set<BroadcastChannelMock>>();

  class BroadcastChannelMock {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    private listeners: Set<(event: MessageEvent) => void> = new Set();

    constructor(name: string) {
      this.name = name;
      if (!channels.has(name)) channels.set(name, new Set());
      channels.get(name)!.add(this);
    }

    postMessage(data: unknown) {
      const payload = typeof structuredClone === 'function' ? structuredClone(data) : JSON.parse(JSON.stringify(data));
      const event = { data: payload } as MessageEvent;
      const peers = channels.get(this.name);
      if (!peers) return;
      peers.forEach((peer) => {
        if (peer === this) return;
        peer.onmessage?.(event);
        peer.listeners.forEach((listener) => listener(event));
      });
    }

    addEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (type === 'message') this.listeners.add(listener);
    }

    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (type === 'message') this.listeners.delete(listener);
    }

    close() {
      const peers = channels.get(this.name);
      peers?.delete(this);
    }
  }

  Object.defineProperty(global, 'BroadcastChannel', {
    value: BroadcastChannelMock,
    configurable: true,
  });
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

if (typeof navigator !== 'undefined' && !('serviceWorker' in navigator)) {
  const listeners = new Set<(event: MessageEvent) => void>();
  const controller = {
    postMessage(message: unknown) {
      const event = { data: message } as MessageEvent;
      listeners.forEach((listener) => listener(event));
    },
  } as any;

  const serviceWorkerMock = {
    controller,
    addEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (type === 'message') listeners.add(listener);
    },
    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (type === 'message') listeners.delete(listener);
    },
    ready: Promise.resolve({} as ServiceWorkerRegistration),
    register: async () => ({} as ServiceWorkerRegistration),
  } as any;

  Object.defineProperty(navigator, 'serviceWorker', {
    value: serviceWorkerMock,
    configurable: true,
  });
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
if (!globalScope.matchMedia) {
  // @ts-ignore
  globalScope.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
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

// Minimal Worker mock for tests
class WorkerMock {
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
// @ts-ignore
global.Worker = WorkerMock as any;

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
