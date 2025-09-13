export const hasOffscreenCanvas = (): boolean =>
  typeof window !== 'undefined' &&
  'OffscreenCanvas' in window &&
  typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

export const supportsCSSHas = (): boolean =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('selector(:has(*))');

