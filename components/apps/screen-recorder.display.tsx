'use client';

import dynamic from 'next/dynamic';

const ScreenRecorderApp = dynamic(() => import('./screen-recorder'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Preparing screen recorder...
    </div>
  ),
});

export const displayScreenRecorder = () => <ScreenRecorderApp />;

displayScreenRecorder.prefetch = () => {
  const loadable = ScreenRecorderApp as { preload?: () => void };
  if (typeof loadable.preload === 'function') {
    loadable.preload();
  }
};
