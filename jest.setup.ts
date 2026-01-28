import { TextEncoder, TextDecoder } from 'util';

jest.setTimeout(20000);
// Polyfill structuredClone before requiring modules that depend on it
// @ts-ignore
if (typeof global.structuredClone !== 'function') {
  // @ts-ignore
  global.structuredClone = (val) => (val === undefined ? val : JSON.parse(JSON.stringify(val)));
}
require('fake-indexeddb/auto');
import '@testing-library/jest-dom';

jest.setTimeout(20000);

// Provide TextEncoder/TextDecoder for libraries that expect them in the test environment
// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder as any;

const { ReadableStream, WritableStream } = require('node:stream/web');
// @ts-ignore
if (typeof global.ReadableStream === 'undefined') {
  // @ts-ignore
  global.ReadableStream = ReadableStream;
}
// @ts-ignore
if (typeof global.WritableStream === 'undefined') {
  // @ts-ignore
  global.WritableStream = WritableStream;
}

const { MessageChannel, MessagePort } = require('worker_threads');
// @ts-ignore
if (typeof global.MessageChannel === 'undefined') {
  // @ts-ignore
  global.MessageChannel = MessageChannel;
}
// @ts-ignore
if (typeof global.MessagePort === 'undefined') {
  // @ts-ignore
  global.MessagePort = MessagePort;
}

// Undici expects these globals to be present; load it after the polyfills are applied.
const { fetch: undiciFetch, Headers, Request, Response } = require('undici');

// Provide a minimal structuredClone polyfill for environments lacking it
// @ts-ignore
if (typeof global.structuredClone === 'undefined') {
  // @ts-ignore
  global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

// Ensure a global `fetch` exists for tests. Jest's jsdom environment
// doesn't provide one on the Node `global` object, which causes
// `jest.spyOn(global, 'fetch')` to fail. Providing a real implementation
// from undici also polyfills Request/Response helpers needed by tests.
// @ts-ignore
if (!global.fetch) {
  // @ts-ignore
  global.fetch = undiciFetch;
}
// @ts-ignore
if (typeof global.Response === 'undefined') {
  // @ts-ignore
  global.Response = Response;
}
// @ts-ignore
if (typeof global.Request === 'undefined') {
  // @ts-ignore
  global.Request = Request;
}
// @ts-ignore
if (typeof global.Headers === 'undefined') {
  // @ts-ignore
  global.Headers = Headers;
}

if (typeof performance !== 'undefined' && !('markResourceTiming' in performance)) {
  // @ts-ignore
  performance.markResourceTiming = () => {};
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

const globalWindow =
  typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>)['window']
    ? ((globalThis as Record<string, unknown>)['window'] as Window | undefined)
    : undefined;

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
    setLineDash: () => {},
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
if (globalWindow && !globalWindow.matchMedia) {
  // @ts-ignore
  globalWindow.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
}

// Minimal IntersectionObserver mock so components relying on it don't crash in tests
if (globalWindow && !('IntersectionObserver' in globalWindow)) {
  class IntersectionObserverMock {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  // @ts-ignore
  globalWindow.IntersectionObserver = IntersectionObserverMock;
  // @ts-ignore
  global.IntersectionObserver = IntersectionObserverMock as any;
}

// jsdom does not implement scrollIntoView; provide a no-op stub so components
// depending on it do not fail during tests.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Simple localStorage mock for environments without it
if (globalWindow && !globalWindow.localStorage) {
  const store: Record<string, string> = {};
  // @ts-ignore
  globalWindow.localStorage = {
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
