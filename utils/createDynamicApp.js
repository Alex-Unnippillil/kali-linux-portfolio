import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

/**
 * Create a lazily loaded app component.
 *
 * IMPORTANT: Pass a *static* loader function (e.g. `() => import('./components/apps/terminal')`).
 * Avoid variable-path imports (like `import(\`../components/apps/${id}\`)`) because they force
 * webpack to build a large context module and dramatically slow down dev compilation.
 */
export const createDynamicApp = (loader, title) =>
  dynamic(
    async () => {
      try {
        if (typeof loader !== 'function') {
          throw new Error(
            `createDynamicApp expected a loader function for "${title}". Received: ${typeof loader}`,
          );
        }
        const mod = await loader();
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

