'use client';

import dynamic from 'next/dynamic';

const DesktopFolderApp = dynamic(() => import('./desktop-folder'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading folder...
    </div>
  ),
});

export const displayDesktopFolder = (_addFolder, openApp, context) => (
  <DesktopFolderApp openApp={openApp} context={context} />
);

displayDesktopFolder.prefetch = () => {
  if (typeof DesktopFolderApp.preload === 'function') {
    DesktopFolderApp.preload();
  }
};
