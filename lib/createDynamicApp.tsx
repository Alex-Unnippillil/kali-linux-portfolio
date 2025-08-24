import React from 'react';
import dynamic from 'next/dynamic';
import ReactGA from 'react-ga4';
import ErrorPane from '../components/ErrorPane';

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
          ReactGA.event('exception', { description: error.message });
          return function DynamicAppError() {
            return (
              <ErrorPane
                code="load_error"
                message={`Failed to load ${name}. Please try again.`}
                onReload={() => window.location.reload()}
              />
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
