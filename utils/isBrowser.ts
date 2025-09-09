export const isBrowser = () =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

export const hasIndexedDB = () =>
  isBrowser() && typeof indexedDB !== 'undefined';
