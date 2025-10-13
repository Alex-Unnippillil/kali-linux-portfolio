'use client';

import dynamic from 'next/dynamic';

const ResourceMonitorApp = dynamic(() => import('./resource_monitor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Starting resource monitor...
    </div>
  ),
});

export const displayResourceMonitor = (_addFolder, openApp) => (
  <ResourceMonitorApp addFolder={_addFolder} openApp={openApp} />
);

displayResourceMonitor.prefetch = () => {
  if (typeof ResourceMonitorApp.preload === 'function') {
    ResourceMonitorApp.preload();
  }
};
