import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Provide TextEncoder/TextDecoder for libraries that expect them in the test environment
// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder as any;

// Stub fetch so tests don't perform real network requests
// @ts-ignore
global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({}) })
);

// Provide minimal URL.createObjectURL and URL.revokeObjectURL implementations
if (!(URL as any).createObjectURL) {
  // @ts-ignore
  URL.createObjectURL = jest.fn(() => 'blob:mock');
}
if (!(URL as any).revokeObjectURL) {
  // @ts-ignore
  URL.revokeObjectURL = jest.fn();
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

// Provide a canvas mock so libraries like xterm.js can run under JSDOM
// @ts-ignore
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray() } as ImageData)),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => new ImageData(0, 0)),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 } as TextMetrics)),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() } as unknown as CanvasGradient)),
}));

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
  onmessage: ((e: any) => void) | null = null;
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
// @ts-ignore
global.Worker = WorkerMock as any;

// Mock xterm and addons so terminal tests run without the real library
jest.mock(
  'xterm',
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
  'xterm-addon-fit',
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
  'xterm-addon-search',
  () => ({
    SearchAddon: class {
      activate() {}
      dispose() {}
    },

  }),
  { virtual: true }
);

// Mock react-cytoscapejs to avoid parsing its ESM build during tests
jest.mock('react-cytoscapejs', () => ({
  __esModule: true,
  default: () => null,
}));
