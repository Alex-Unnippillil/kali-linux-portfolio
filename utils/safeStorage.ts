import { hasStorage } from './env';

export const safeLocalStorage: Storage | undefined = hasStorage ? window.localStorage : undefined;
