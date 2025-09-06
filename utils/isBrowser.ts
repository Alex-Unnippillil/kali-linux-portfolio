/* eslint-disable no-top-level-window/no-top-level-window-or-document */
export const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined';
export const hasIndexedDB = (): boolean =>
  isBrowser() && typeof indexedDB !== 'undefined';
