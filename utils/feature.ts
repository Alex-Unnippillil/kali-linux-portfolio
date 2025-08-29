export const hasOffscreenCanvas = (): boolean =>
  typeof window !== 'undefined' &&
  'OffscreenCanvas' in window &&
  typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

