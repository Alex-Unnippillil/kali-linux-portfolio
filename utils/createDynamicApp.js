import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

const APP_DIR = '../apps';

export const createDynamicApp = (id, title) =>
  dynamic(
    async () => {
      try {
        let mod;
        try {
          mod = await import(
            /* webpackChunkName: "[request]", webpackPrefetch: true */ `${APP_DIR}/${id}`
          );
        } catch {
          try {
            mod = await import(
              /* webpackChunkName: "[request]", webpackPrefetch: true */ `${APP_DIR}/${id}/index`
            );
          } catch {
            try {
              mod = await import(
                /* webpackChunkName: "[request]", webpackPrefetch: true */ `${APP_DIR}/${id.replace('_', '-')}`
              );
            } catch {
              console.warn(
                `App "${id}" could not be found in ${APP_DIR}. The fallback to components/apps has been removed; please migrate the app to ${APP_DIR}.`
              );
              throw new Error(`App "${id}" not found in ${APP_DIR}`);
            }
          }
        }
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        return mod.default;
      } catch (err) {
        console.error(`Failed to load ${title}`, err);
        const Fallback = () => (
          <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
            {`Unable to load ${title}`}
          </div>
        );
        Fallback.displayName = 'DynamicAppError';
        return Fallback;
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

