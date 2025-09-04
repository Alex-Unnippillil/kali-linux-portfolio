import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { logEvent } from './analytics';
import ErrorBoundary from '../components/core/ErrorBoundary';

export const createDynamicApp = (id, title) =>
  dynamic(
    async () => {
      try {
        const mod = await import(
          /* webpackPrefetch: true */ `../components/apps/${id}`
        );
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        const Component = mod.default;
        const Wrapped = (props) => (
          <ErrorBoundary
            fallback={(error, reset) => (
              <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-ub-cool-grey text-white p-4 text-center">
                <p>{`Something went wrong in ${title}.`}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded bg-slate-100 px-4 py-2 text-sm text-black hover:bg-slate-200"
                  >
                    Try again
                  </button>
                  <Link
                    href="/apps/contact"
                    className="rounded bg-slate-100 px-4 py-2 text-sm text-black hover:bg-slate-200"
                  >
                    Report issue
                  </Link>
                </div>
              </div>
            )}
          >
            <Component {...props} />
          </ErrorBoundary>
        );
        Wrapped.displayName = `${title}WithErrorBoundary`;
        return Wrapped;
      } catch (err) {
        console.error(`Failed to load ${title}`, err);
        const Failed = () => (
          <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
            {`Unable to load ${title}`}
          </div>
        );
        Failed.displayName = `${title}LoadError`;
        return Failed;
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

