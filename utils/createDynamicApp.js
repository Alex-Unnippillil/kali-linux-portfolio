import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from '@/utils/analytics';
import ErrorBoundary from '@/components/core/ErrorBoundary';

const APP_DIR = '@/apps';

export const createDynamicApp = (id, title) => {
  const DynamicApp = dynamic(
    async () => {
      try {
        let mod;
        try {
          mod = await import(
            /* webpackInclude: /\.(js|jsx|ts|tsx)$/, 
               webpackExclude: /\.test\.(js|jsx|ts|tsx)$/, 
               webpackChunkName: "[request]", 
               webpackPrefetch: true */ `@/apps/${id}`
          );
        } catch {
          try {
            mod = await import(
              /* webpackInclude: /\.(js|jsx|ts|tsx)$/, 
                 webpackExclude: /\.test\.(js|jsx|ts|tsx)$/, 
                 webpackChunkName: "[request]", 
                 webpackPrefetch: true */ `@/apps/${id}/index`
            );
          } catch {
            try {
              mod = await import(
                /* webpackInclude: /\.(js|jsx|ts|tsx)$/, 
                   webpackExclude: /\.test\.(js|jsx|ts|tsx)$/, 
                   webpackChunkName: "[request]", 
                   webpackPrefetch: true */ `@/apps/${id.replace('_', '-')}`
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
          const Fallback = () => {
            const handleRetry = () => window.location.reload();
            return (
              <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
                <p className="mb-2">{`Unable to load ${title}.`}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-3 py-1 bg-ub-orange text-black rounded"
                >
                  Retry
                </button>
              </div>
            );
          };
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

  const WrappedApp = (props) => (
    <ErrorBoundary>
      <DynamicApp {...props} />
    </ErrorBoundary>
  );

  WrappedApp.displayName = `${title}WithErrorBoundary`;
  return WrappedApp;
};

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

