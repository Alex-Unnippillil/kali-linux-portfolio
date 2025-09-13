/* eslint-disable react/display-name */
import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

export const createDynamicApp = (id, title) =>
  dynamic(
    async () => {
      try {
        const mod = await import(
          /* webpackPrefetch: true */ `../components/apps/${id}`
        );
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        return mod.default;
      } catch (err) {
        console.error(`Failed to load ${title}`, err);
        return () => (
          <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
            {`Unable to load ${title}`}
          </div>
        );
      }
    },
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
  const DynamicComponent = dynamic(() => Promise.resolve({ default: Component }), {
    ssr: false,
  });
  const Display = (addFolder, openApp) => (
    <DynamicComponent addFolder={addFolder} openApp={openApp} />
  );

  Display.prefetch = () => {
    if (typeof Component.preload === 'function') {
      Component.preload();
    }
  };

  return Display;
};

