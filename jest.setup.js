import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Provide TextEncoder/TextDecoder for libraries that expect them in the test environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

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

global.Image = ImageMock;

// Provide a minimal canvas mock so libraries like xterm.js can run under JSDOM
HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({
    data: new Uint8ClampedArray()
  }),
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
  measureText: () => ({
    width: 0
  }),
  transform: () => {},
  rect: () => {},
  clip: () => {},
  createLinearGradient: () => ({
    addColorStop: () => {}
  })
});

// Basic matchMedia mock for libraries that expect it
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {}
  });
}

// Simple localStorage mock for environments without it
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = {};
  window.localStorage = {
    getItem: key => key in store ? store[key] : null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: key => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    }
  };
}

// Minimal Worker mock for tests
class WorkerMock {
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
global.Worker = WorkerMock;

// Mock xterm and addons so terminal tests run without the real library
jest.mock('@xterm/xterm', () => ({
  Terminal: class {
    loadAddon() {}
    write() {}
    writeln() {}
    open() {}
    dispose() {}
    onKey() {}
    onData() {}
    get buffer() {
      return {
        active: {
          getLine: () => ({
            translateToString: () => ''
          })
        }
      };
    }
  }
}), {
  virtual: true
});
jest.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    activate() {}
    dispose() {}
    fit() {}
  }
}), {
  virtual: true
});
jest.mock('@xterm/addon-search', () => ({
  SearchAddon: class {
    activate() {}
    dispose() {}
  }
}), {
  virtual: true
});
