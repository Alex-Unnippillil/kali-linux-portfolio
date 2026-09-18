import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

const buildErrorFallback = (title, loader) => {
  const ErrorFallback = (props) => {
    const [Component, setComponent] = useState(null);
    const [pending, setPending] = useState(false);
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const retry = async () => {
      setPending(true);
      try {
        const mod = await loader();
        if (mounted.current) setComponent(() => mod.default);
      } catch { /* Keep the local recovery UI; never reload other unsaved apps. */ }
      finally { if (mounted.current) setPending(false); }
    };
    if (Component) return <Component {...props} />;
    return <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-ub-cool-grey p-4 text-center text-white">
      <p role="alert">{`Unable to load ${title}`}</p>
      <p className="text-sm text-gray-300">Check your connection, then try again. Other open apps are unaffected.</p>
      <button type="button" onClick={retry} disabled={pending} className="min-h-[44px] rounded border border-sky-300 px-4 focus-visible:outline focus-visible:outline-2">{pending ? 'Retrying…' : 'Try again'}</button>
    </div>;
  };
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
    <div role="status" className="h-full w-full flex flex-col items-center justify-center gap-3 bg-ub-cool-grey text-white">
      <span className="h-6 w-6 animate-spin motion-reduce:animate-none rounded-full border-2 border-white border-t-transparent" />
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
        return buildErrorFallback(title, loader);
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
