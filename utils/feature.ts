import { isBrowser } from '@/utils/env';
export const hasOffscreenCanvas = (): boolean =>
  isBrowser() &&
  'OffscreenCanvas' in window &&
  typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

