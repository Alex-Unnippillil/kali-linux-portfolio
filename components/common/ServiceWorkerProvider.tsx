'use client';

import { ReactNode, useEffect } from 'react';

interface Props {
  children: ReactNode;
}

export default function ServiceWorkerProvider({ children }: Props) {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'registerProtocolHandler' in navigator) {
      try {
        navigator.registerProtocolHandler('web+kali', '/protocol?url=%s');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Protocol handler registration failed', err);
      }
    }
  }, []);

  return <>{children}</>;
}

