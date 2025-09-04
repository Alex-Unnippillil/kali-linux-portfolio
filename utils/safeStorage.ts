import { hasStorage } from './env';

export const safeLocalStorage: Storage | undefined =
  hasStorage ? localStorage : undefined;
