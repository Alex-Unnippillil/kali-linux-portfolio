import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

export const createDynamicApp = (path, name) =>
  dynamic(
    () =>
      import(`../components/apps/${path}`).then((mod) => {
        logEvent({ category: 'Application', action: `Loaded ${name}` });
        return mod.default;
      }),
    {
      ssr: false,
      loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
          {`Loading ${name}...`}
        </div>
      ),
    }
  );

export const createDisplay = (Component) => (addFolder, openApp) => (
  <Component addFolder={addFolder} openApp={openApp} />
);

