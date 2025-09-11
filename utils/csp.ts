export function getCspNonce(): string | undefined {
  if (typeof document !== 'undefined') {
    return document.documentElement.dataset.cspNonce;
  }
  return undefined;
}
