export { isBrowser } from './isBrowser';
export const hasIDB = typeof indexedDB !== 'undefined';
export const hasStorage = typeof localStorage !== 'undefined';
export const hasSessionStorage = typeof sessionStorage !== 'undefined';
