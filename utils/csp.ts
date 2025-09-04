import { isBrowser } from './isBrowser';

export function getCspNonce(): string | undefined {
  if (isBrowser) {
    return globalThis.document.documentElement.dataset.cspNonce;
  }
  return undefined;
}
