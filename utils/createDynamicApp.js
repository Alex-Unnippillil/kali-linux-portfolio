import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

export const createDynamicApp = (id, title) =>
  dynamic(
    () =>
      import(/* webpackPrefetch: true */ `../components/apps/${id}`).then((mod) => {
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        return mod.default;
      }),
    {
      ssr: false,
      loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
          {`Loading ${title}...`}
        </div>
      ),
    }
  );

export const createDisplay = (Component) => {
  const Display = (addFolder, openApp) => (
    <Component addFolder={addFolder} openApp={openApp} />
  );

  Display.prefetch = () => {
    if (typeof Component.preload === 'function') {
      Component.preload();
    }
  };

  return Display;
};

