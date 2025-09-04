export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
export const hasIDB = typeof indexedDB !== 'undefined';
export const hasStorage = typeof localStorage !== 'undefined';
