import { isBrowser } from './isBrowser';

export const hasOffscreenCanvas = (): boolean =>
  isBrowser &&
  'OffscreenCanvas' in globalThis &&
  typeof globalThis.HTMLCanvasElement !== 'undefined' &&
  typeof globalThis.HTMLCanvasElement.prototype.transferControlToOffscreen ===
    'function';

