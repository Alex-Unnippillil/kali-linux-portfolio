import { createContext, useContext } from 'react';

export const CspNonceContext = createContext<string | undefined>(undefined);

export function getCspNonce(): string | undefined {
  if (typeof document !== 'undefined') {
    return document.documentElement.dataset.cspNonce;
  }
  return undefined;
}

export function useCspNonce(): string | undefined {
  const ctxNonce = useContext(CspNonceContext);
  return ctxNonce ?? getCspNonce();
}
