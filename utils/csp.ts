import { isBrowser } from './isBrowser';

export function getCspNonce(): string | undefined {
  if (isBrowser()) {
    return document.documentElement.dataset.cspNonce;
  }
  return undefined;
}
