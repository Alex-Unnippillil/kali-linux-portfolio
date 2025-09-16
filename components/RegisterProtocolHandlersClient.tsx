'use client';

import { useEffect } from 'react';

type ProtocolHandlerConfig = {
  scheme: string;
  path: string;
  title: string;
};

const PROTOCOL_HANDLERS: ProtocolHandlerConfig[] = [
  {
    scheme: 'web+ssh',
    path: '/apps/ssh?target=%s',
    title: 'SSH Command Builder',
  },
  {
    scheme: 'web+term',
    path: '/apps/terminal?target=%s',
    title: 'Terminal',
  },
];

const RegisterProtocolHandlersClient = () => {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      typeof navigator.registerProtocolHandler !== 'function'
    ) {
      return;
    }

    PROTOCOL_HANDLERS.forEach(({ scheme, path, title }) => {
      try {
        const handlerUrl = path.startsWith('http')
          ? path
          : `${window.location.origin}${path}`;
        navigator.registerProtocolHandler(scheme, handlerUrl, title);
      } catch (error) {
        console.error(`Failed to register protocol handler for ${scheme}`, error);
      }
    });
  }, []);

  return null;
};

export default RegisterProtocolHandlersClient;
