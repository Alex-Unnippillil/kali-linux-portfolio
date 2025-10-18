'use client';

import dynamic from 'next/dynamic';

const FirefoxApp = dynamic(() => import('./firefox'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Launching Firefox...
    </div>
  ),
});

export const displayFirefox = () => <FirefoxApp />;

displayFirefox.prefetch = () => {
  const loadable = FirefoxApp as { preload?: () => void };
  if (typeof loadable.preload === 'function') {
    loadable.preload();
  }
};
