/* eslint-disable no-top-level-window/no-top-level-window-or-document */
export const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';
export const hasIndexedDB =
  isBrowser && typeof indexedDB !== 'undefined';
