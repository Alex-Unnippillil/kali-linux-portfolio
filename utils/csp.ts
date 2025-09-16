import { createContext, createElement, useContext } from 'react';
import type { ReactNode } from 'react';

const CspNonceContext = createContext<string | undefined>(undefined);

type ProviderProps = {
  children: ReactNode;
  nonce?: string;
};

export function CspNonceProvider({ children, nonce }: ProviderProps) {
  return createElement(CspNonceContext.Provider, { value: nonce }, children);
}

export function useCspNonce(): string | undefined {
  const contextNonce = useContext(CspNonceContext);
  if (contextNonce) {
    return contextNonce;
  }

  if (typeof document !== 'undefined') {
    return document.documentElement.dataset.cspNonce;
  }

  return undefined;
}
