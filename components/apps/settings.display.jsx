'use client';

import dynamic from 'next/dynamic';

const SettingsApp = dynamic(() => import('./settings'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading settings...
    </div>
  ),
});

export const displaySettings = () => <SettingsApp />;

displaySettings.prefetch = () => {
  if (typeof SettingsApp.preload === 'function') {
    SettingsApp.preload();
  }
};
