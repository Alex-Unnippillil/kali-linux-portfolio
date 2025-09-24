import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

export const createDynamicApp = (id, title) => {
  const loadModule = () =>
    import(
      /* webpackPrefetch: true */ `../components/apps/${id}`
    );

  const DynamicComponent = dynamic(
    async () => {
      try {
        const mod = await loadModule();
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        return mod.default;
      } catch (err) {
        console.error(`Failed to load ${title}`, err);
        const ErrorFallback = () => (
          <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
            {`Unable to load ${title}`}
          </div>
        );
        ErrorFallback.displayName = `${title}LoadError`;
        return ErrorFallback;
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

  DynamicComponent.prefetch = () =>
    loadModule().catch((err) => {
      console.error(`Failed to prefetch ${title}`, err);
    });

  return DynamicComponent;
};

export const createDisplay = (Component) => {
  const DynamicComponent = dynamic(() => Promise.resolve({ default: Component }), {
    ssr: false,
  });
  const Display = (addFolder, openApp) => (
    <DynamicComponent addFolder={addFolder} openApp={openApp} />
  );

  Display.prefetch = () => {
    if (typeof Component.prefetch === 'function') {
      return Component.prefetch();
    }

    if (typeof Component.preload === 'function') {
      return Component.preload();
    }

    return undefined;
  };

  return Display;
};

