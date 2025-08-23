import React from 'react';
import dynamic from 'next/dynamic';
import ReactGA from 'react-ga4';

const createDynamicApp = (path: string, name: string) =>
  dynamic(
    () =>
      import(`../components/apps/${path}`)
        .then((mod) => {
          ReactGA.event({ category: 'Application', action: `Loaded ${name}` });
          return mod.default;
        })
        .catch((error) => {
          ReactGA.exception({
            description: `Failed to load ${name}: ${error.message}`,
            fatal: false,
          });
          return () => (
            <div className="h-full w-full flex items-center justify-center bg-panel text-white">
              {`Failed to load ${name}.`}
            </div>
          );
        }),
    {
      ssr: false,
      loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-panel text-white">
          {`Loading ${name}...`}
        </div>
      ),
    }
  );

export default createDynamicApp;
