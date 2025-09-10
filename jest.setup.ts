import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';

// Provide TextEncoder/TextDecoder in the test environment
if (!global.TextEncoder) {
  // @ts-expect-error Polyfill for test environment
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  // @ts-expect-error Polyfill for test environment
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
// @ts-expect-error Polyfill for test environment
if (!global.localStorage) {
  // @ts-expect-error Polyfill for test environment
  global.localStorage = localStorageMock;
}
// @ts-expect-error Polyfill for test environment
if (typeof window !== 'undefined' && !window.localStorage) {
  // @ts-expect-error Polyfill for test environment
  window.localStorage = localStorageMock;
}

// Basic IntersectionObserver mock
class IntersectionObserverMock {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error Polyfill for test environment
if (!global.IntersectionObserver) {
  // @ts-expect-error Polyfill for test environment
  global.IntersectionObserver = IntersectionObserverMock;
}
// @ts-expect-error Polyfill for test environment
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  // @ts-expect-error Polyfill for test environment
  window.IntersectionObserver = IntersectionObserverMock;
}

// matchMedia mock for components expecting it
// @ts-expect-error Polyfill for test environment
if (typeof window !== 'undefined' && !window.matchMedia) {
  // @ts-expect-error Polyfill for test environment
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
// @ts-expect-error Polyfill for test environment
if (!global.fetch) {
  // @ts-expect-error Polyfill for test environment
  global.fetch = () => Promise.reject(new Error('fetch not implemented'));
}

// Canvas mock for tests relying on 2D context
if (typeof HTMLCanvasElement !== 'undefined') {
  // @ts-expect-error Polyfill for test environment
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
