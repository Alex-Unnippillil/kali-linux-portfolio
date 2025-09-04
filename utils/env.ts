import { isBrowser } from './isBrowser';

export { isBrowser };
export const hasIDB = typeof globalThis.indexedDB !== 'undefined';
export const hasStorage = typeof globalThis.localStorage !== 'undefined';
