import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';

// Provide TextEncoder/TextDecoder in the test environment
if (!global.TextEncoder) {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  // @ts-ignore
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
// @ts-ignore
if (!global.localStorage) {
  // @ts-ignore
  global.localStorage = localStorageMock;
}
// @ts-ignore
if (typeof window !== 'undefined' && !window.localStorage) {
  // @ts-ignore
  window.localStorage = localStorageMock;
}

// Basic IntersectionObserver mock
class IntersectionObserverMock {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
if (!global.IntersectionObserver) {
  // @ts-ignore
  global.IntersectionObserver = IntersectionObserverMock;
}
// @ts-ignore
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  // @ts-ignore
  window.IntersectionObserver = IntersectionObserverMock;
}

// matchMedia mock for components expecting it
// @ts-ignore
if (typeof window !== 'undefined' && !window.matchMedia) {
  // @ts-ignore
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
// @ts-ignore
if (!global.fetch) {
  // @ts-ignore
  global.fetch = () => Promise.reject(new Error('fetch not implemented'));
}

// Canvas mock for tests relying on 2D context
if (typeof HTMLCanvasElement !== 'undefined') {
  // @ts-ignore
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
