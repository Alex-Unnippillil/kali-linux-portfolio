import React from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from './analytics';
import { registerApp } from '../lib/appRegistry';

const createImporter = (id) =>
  import(
    /* webpackPrefetch: true */ `../components/apps/${id}`
  );

export const createDynamicApp = (id, title, options = {}) => {
  const importer = () => createImporter(id);

  registerApp({ id, title, importer, heavy: options.heavy });

  const loadComponent = async () => {
    try {
      const mod = await importer();
      logEvent({ category: 'Application', action: `Loaded ${title}` });
      return mod.default;
    } catch (err) {
      console.error(`Failed to load ${title}`, err);
      const Fallback = () => (
        <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
          {`Unable to load ${title}`}
        </div>
      );
      Fallback.displayName = `${title}Fallback`;
      return Fallback;
    }
  };

  const Component = dynamic(loadComponent, {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        {`Loading ${title}...`}
      </div>
    ),
  });

  Component.importer = importer;
  Component.displayName = `DynamicApp(${title})`;

  return Component;
};

export const createDisplay = (Component) => {
  const DynamicComponent = dynamic(() => Promise.resolve({ default: Component }), {
    ssr: false,
  });
  const Display = (addFolder, openApp) => (
    <DynamicComponent addFolder={addFolder} openApp={openApp} />
  );

  Display.prefetch = () => {
    if (typeof Component.importer === 'function') {
      Component.importer();
    } else if (typeof Component.preload === 'function') {
      Component.preload();
    }
  };

  Display.importer = Component.importer;

  return Display;
};

