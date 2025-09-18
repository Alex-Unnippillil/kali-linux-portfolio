import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';

const createImporter = (id) =>
  () =>
    import(
      /* webpackPrefetch: true */ `../components/apps/${id}`
    );

export const createDynamicApp = (id, title) => {
  const importer = createImporter(id);

  const DynamicComponent = dynamic(
    async () => {
      try {
        const mod = await importer();
        logEvent({ category: 'Application', action: `Loaded ${title}` });
        return mod.default || mod;
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

  DynamicComponent.importer = importer;

  return DynamicComponent;
};

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

  if (Component.importer) {
    Display.importer = Component.importer;
  }

  return Display;
};

