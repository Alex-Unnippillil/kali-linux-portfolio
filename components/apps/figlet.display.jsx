'use client';

import dynamic from 'next/dynamic';

const FigletApp = dynamic(() => import('./figlet'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading figlet...
    </div>
  ),
});

export const displayFiglet = () => <FigletApp />;

displayFiglet.prefetch = () => {
  if (typeof FigletApp.preload === 'function') {
    FigletApp.preload();
  }
};
