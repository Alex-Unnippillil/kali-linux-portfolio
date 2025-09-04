import { hasStorage } from './env';

export const safeLocalStorage: Storage | undefined = hasStorage
  ? globalThis.localStorage
  : undefined;
