'use client';

import dynamic from 'next/dynamic';

const ClipboardManagerApp = dynamic(() => import('./ClipboardManager'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Opening clipboard history...
    </div>
  ),
});

export const displayClipboardManager = () => <ClipboardManagerApp />;

displayClipboardManager.prefetch = () => {
  const loadable = ClipboardManagerApp as { preload?: () => void };
  if (typeof loadable.preload === 'function') {
    loadable.preload();
  }
};
