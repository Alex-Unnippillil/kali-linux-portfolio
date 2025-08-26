import '@testing-library/jest-dom';

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
