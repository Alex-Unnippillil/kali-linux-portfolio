'use client';

import dynamic from 'next/dynamic';

const XApp = dynamic(() => import('./x'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading X...
    </div>
  ),
});

export const displayX = () => <XApp />;

displayX.prefetch = () => {
  if (typeof XApp.preload === 'function') {
    XApp.preload();
  }
};
