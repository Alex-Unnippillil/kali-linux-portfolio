'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';

declare global {
  interface Window {
    routeAbortController?: AbortController;
  }
}

export default function UseRouteAbortGuard() {
  const router = useRouter();

  useEffect(() => {
    window.routeAbortController = new AbortController();
    const handleRouteChange = () => {
      window.routeAbortController?.abort();
      window.routeAbortController = new AbortController();
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      window.routeAbortController?.abort();
      delete window.routeAbortController;
    };
  }, [router.events]);

  return null;
}
