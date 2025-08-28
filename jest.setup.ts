import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Provide TextEncoder/TextDecoder for libraries that expect them in the test environment
// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder as any;

// Ensure a global `fetch` exists for tests. Jest's jsdom environment
// doesn't provide one on the Node `global` object, which causes
// `jest.spyOn(global, 'fetch')` to fail. Providing a simple stub allows
// tests to spy on and mock `fetch` as needed.
// @ts-ignore
if (!global.fetch) {
  // @ts-ignore
  global.fetch = () => Promise.reject(new Error('fetch not implemented'));
}

// Minimal ResizeObserver mock for components using it
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  // @ts-ignore
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
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

// Provide a minimal canvas mock so libraries like xterm.js can run under JSDOM
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

// Basic matchMedia mock for libraries that expect it
if (typeof window !== 'undefined' && !window.matchMedia) {
  // @ts-ignore
  window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
}

// Simple localStorage mock for environments without it
if (typeof window !== 'undefined' && !window.localStorage) {
  const store: Record<string, string> = {};
  // @ts-ignore
  window.localStorage = {
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
