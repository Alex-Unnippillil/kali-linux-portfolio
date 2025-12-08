import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';
import Toast from '../components/ui/Toast';

export const createDynamicAppWithRetry = (id, title) =>
  dynamic(
    async () => {
      const load = async () =>
        import(/* webpackPrefetch: true */ `../components/apps/${id}`);
      try {
        const mod = await load();
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        return mod.default;
      } catch (err) {
        try {
          const mod = await load();
          logEvent({ category: 'Application', action: `Loaded ${title}` });
          return mod.default;
        } catch (err2) {
          console.error(`Failed to load ${title}`, err2);
          const LoadError = () => (
            <>
              <Toast message={`Unable to load ${title}`} />
              <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
                {`Unable to load ${title}`}
              </div>
            </>
          );
          return LoadError;
        }
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

export const createDynamicApp = createDynamicAppWithRetry;

export const createDisplay = (Component) => {
  const DynamicComponent = dynamic(() => Promise.resolve({ default: Component }), {
    ssr: false,
  });
  const Display = (addFolder, openApp, context) => {
    const extraProps =
      context && typeof context === 'object' ? context : undefined;
    return (
      <DynamicComponent
        addFolder={addFolder}
        openApp={openApp}
        context={context}
        {...(extraProps || {})}
      />
    );
  };

  Display.prefetch = () => {
    if (typeof Component.preload === 'function') {
      Component.preload();
    }
  };

  return Display;
};

