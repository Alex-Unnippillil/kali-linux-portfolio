import React from 'react';
import dynamic from 'next/dynamic';
import LazyAppBoundary from '../components/util-components/LazyAppBoundary';
import { logEvent } from './analytics';

export const createDynamicApp = (id, title, options = {}) =>
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
      ...(options.suspense
        ? { suspense: true }
        : {
            loading: () => (
              <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
                {`Loading ${title}...`}
              </div>
            ),
          }),
    }
  );

export const createDisplay = (Component, options = {}) => {
  const DynamicComponent = dynamic(() => Promise.resolve({ default: Component }), {
    ssr: false,
    ...(options.suspense ? { suspense: true } : {}),
  });
  const Display = (addFolder, openApp, context) => {
    const extraProps =
      context && typeof context === 'object' ? context : undefined;
    const element = (
      <DynamicComponent
        addFolder={addFolder}
        openApp={openApp}
        context={context}
        {...(extraProps || {})}
      />
    );

    if (options.suspense) {
      const fallback =
        typeof options.fallback === 'function'
          ? options.fallback()
          : options.fallback || (
              <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
                Loading…
              </div>
            );

      return <LazyAppBoundary fallback={fallback}>{element}</LazyAppBoundary>;
    }

    return element;
  };

  Display.prefetch = () => {
    if (typeof Component.preload === 'function') {
      Component.preload();
    }
  };

  return Display;
};

