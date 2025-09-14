"use client";

import { ReactNode, useEffect } from 'react';

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

export default function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.registerProtocolHandler) {
      try {
        navigator.registerProtocolHandler('web+foo', '/protocol?url=%s');
      } catch (err) {
        console.error('Protocol handler registration failed', err);
      }
    }
  }, []);

  return <>{children}</>;
}

