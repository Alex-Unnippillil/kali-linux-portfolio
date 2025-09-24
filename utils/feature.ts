export const hasOffscreenCanvas = (): boolean =>
  typeof window !== 'undefined' &&
  'OffscreenCanvas' in window &&
  typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

export const supportsFSAccess = (): boolean =>
  typeof window !== 'undefined' && 'showOpenFilePicker' in window;

export const supportsBluetooth = (): boolean =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator;

