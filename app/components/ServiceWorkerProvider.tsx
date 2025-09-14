'use client';

import { createContext, useEffect, useState, ReactNode } from 'react';

export const ServiceWorkerContext = createContext<ServiceWorkerRegistration | null>(null);

interface Props {
  children: ReactNode;
}

const ServiceWorkerProvider = ({ children }: Props) => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => setRegistration(reg))
        .catch((err) => {
          console.error('Service worker ready wait failed', err);
        });
    }
  }, []);

  return (
    <ServiceWorkerContext.Provider value={registration}>
      {children}
    </ServiceWorkerContext.Provider>
  );
};

export default ServiceWorkerProvider;
