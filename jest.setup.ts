import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';

// Provide TextEncoder/TextDecoder in the test environment
if (!global.TextEncoder) {
  // @ts-expect-error Missing TextEncoder in Jest environment
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  // @ts-expect-error Missing TextDecoder in Jest environment
  global.TextDecoder = TextDecoder as any;
}

// Simple localStorage mock
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}
const localStorageMock = new LocalStorageMock();
// @ts-expect-error Node globals lack localStorage
if (!global.localStorage) {
  // @ts-expect-error Assign mock localStorage to global
  global.localStorage = localStorageMock;
}
// @ts-expect-error window missing localStorage in JSDOM
if (typeof window !== 'undefined' && !window.localStorage) {
  // @ts-expect-error Assign mock localStorage to window
  window.localStorage = localStorageMock;
}

// Basic IntersectionObserver mock
class IntersectionObserverMock {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error JSDOM missing IntersectionObserver
if (!global.IntersectionObserver) {
  // @ts-expect-error Assign mock IntersectionObserver
  global.IntersectionObserver = IntersectionObserverMock;
}
// @ts-expect-error JSDOM window missing IntersectionObserver
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  // @ts-expect-error Assign mock IntersectionObserver to window
  window.IntersectionObserver = IntersectionObserverMock;
}

// matchMedia mock for components expecting it
// @ts-expect-error JSDOM lacks matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  // @ts-expect-error Provide mock matchMedia
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Provide a stub for fetch so tests can spy on it
// @ts-expect-error Node test environment lacks fetch
if (!global.fetch) {
  // @ts-expect-error Assign mock fetch
  global.fetch = () => Promise.reject(new Error('fetch not implemented'));
}

// Canvas mock for tests relying on 2D context
if (typeof HTMLCanvasElement !== 'undefined') {
  // @ts-expect-error JSDOM Canvas API incomplete
  HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray() }),
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
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
  });
}
