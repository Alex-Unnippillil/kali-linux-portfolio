'use client';

import dynamic from 'next/dynamic';

const NiktoApp = dynamic(() => import('./nikto'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading Nikto simulation...
    </div>
  ),
});

export const displayNikto = () => <NiktoApp />;

displayNikto.prefetch = () => {
  if (typeof NiktoApp.preload === 'function') {
    NiktoApp.preload();
  }
};
