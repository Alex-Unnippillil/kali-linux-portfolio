import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';
import AppLoader from '../components/AppLoader';

export const createDynamicApp = (path, name) =>
  dynamic(
    () =>
      import(`../components/apps/${path}`).then((mod) => {
        logEvent({ category: 'Application', action: `Loaded ${name}` });
        return mod.default;
      }),
    {
      ssr: false,
      loading: () => <AppLoader />,
    }
  );

export const createDisplay = (Component) => (addFolder, openApp) => (
  <Component addFolder={addFolder} openApp={openApp} />
);

