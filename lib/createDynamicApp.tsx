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
          ReactGA.event({
            category: 'Application',
            action: `Failed to load ${name}`,
            label: error.message,
          });
          return function DynamicAppError() {
            return (
              <div className="h-full w-full flex items-center justify-center bg-panel text-white">
                {`Failed to load ${name}.`}
              </div>
            );
          };
        }),
      {
        ssr: false,
      loading: function Loading() {
        return (
          <div className="h-full w-full flex items-center justify-center bg-panel text-white">
            {`Loading ${name}...`}
          </div>
        );
      },
      }
    );

export default createDynamicApp;
