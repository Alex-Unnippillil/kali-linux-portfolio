import { hasSessionStorage, hasStorage } from './env';

export const safeLocalStorage: Storage | undefined =
  hasStorage ? localStorage : undefined;

export const safeSessionStorage: Storage | undefined =
  hasSessionStorage ? sessionStorage : undefined;
