import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

const buildErrorFallback = (title) => {
  const ErrorFallback = () => (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      {`Unable to load ${title}`}
    </div>
  );

  ErrorFallback.displayName = `${title}Error`;

  return ErrorFallback;
};

/**
 * Create a lazily loaded app component.
 *
 * IMPORTANT: Pass a *static* loader function (e.g. `() => import('./components/apps/terminal')`).
 * Avoid variable-path imports (like `import(\`../components/apps/${id}\`)`) because they force
 * webpack to build a large context module and dramatically slow down dev compilation.
 */
export const createDynamicApp = (loader, title) => {
  const Loading = () => (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-ub-cool-grey text-white">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
      <span>{`Loading ${title}...`}</span>
    </div>
  );

  Loading.displayName = `${title}Loading`;

  return dynamic(
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
        return buildErrorFallback(title);
      }
    },
    {
      ssr: false,
      loading: Loading,
    }
  );
};

export const createDisplay = (Component) => {
  const DynamicComponent = dynamic(() => Promise.resolve({ default: Component }), {
    ssr: false,
  });
  const Display = (addFolder, openApp, context, windowMeta) => {
    const extraProps =
      context && typeof context === 'object' ? context : undefined;
    return (
      <DynamicComponent
        addFolder={addFolder}
        openApp={openApp}
        context={context}
        windowMeta={windowMeta}
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
