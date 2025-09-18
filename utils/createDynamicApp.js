import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';
import AppErrorBoundary from '../components/apps/AppErrorBoundary';
import ErrorScreen from '../components/common/ErrorScreen';
import { createLogger } from '../lib/logger';

const log = createLogger();

export const createDynamicApp = (id, title) =>
  dynamic(
    async () => {
      try {
        const mod = await import(
          /* webpackPrefetch: true */ `../components/apps/${id}`
        );
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        const Component = mod?.default;
        if (!Component) {
          throw new Error(`Module "${id}" is missing a default export`);
        }

        return function WrappedDynamicApp(props) {
          return (
            <AppErrorBoundary appId={id} appTitle={title}>
              <Component {...props} />
            </AppErrorBoundary>
          );
        };
      } catch (err) {
        log.error('Failed to load dynamic app', { appId: id, title, error: err });
        const details =
          err instanceof Error
            ? `${err.message}${err.stack ? `\n\n${err.stack}` : ''}`
            : String(err);

        return function DynamicAppFallback() {
          return (
            <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
              <ErrorScreen
                title={`Unable to load ${title}`}
                message="We couldn't boot this module. Try again or open the troubleshooting guide for manual recovery steps."
                code={details}
                onRetry={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                logHref="/docs/troubleshooting#app-recovery"
                layout="compact"
                className="bg-ub-cool-grey text-white"
              />
            </div>
          );
        };
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

