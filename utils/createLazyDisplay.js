import React from 'react';
import dynamic from 'next/dynamic';

const DefaultFallback = ({ title }) => (
  <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
    {title ? `Loading ${title}...` : 'Loading...'}
  </div>
);

const normalizeLoader = (loader) => {
  if (typeof loader === 'function') {
    return loader;
  }
  throw new TypeError('createLazyDisplay expects a loader function');
};

const resolveExport = (mod, exportName) => {
  if (exportName) {
    return mod?.[exportName];
  }
  return mod?.default;
};

export const createLazyDisplay = (
  loader,
  { exportName, loadingTitle, loadingComponent } = {}
) => {
  const normalizedLoader = normalizeLoader(loader);
  const DynamicDisplay = dynamic(async () => {
    const mod = await normalizedLoader();
    const displayFactory = resolveExport(mod, exportName);
    if (typeof displayFactory !== 'function') {
      throw new Error(
        `Expected a display factory function from dynamic module${exportName ? ` export "${exportName}"` : ''}`
      );
    }
    const DisplayComponent = (props) =>
      displayFactory(props.addFolder, props.openApp, props.context);
    DisplayComponent.displayName = `LazyDisplay(${exportName || 'default'})`;
    return { default: DisplayComponent };
  }, {
    ssr: false,
    loading: () => {
      if (typeof loadingComponent === 'function') {
        return loadingComponent();
      }
      return <DefaultFallback title={loadingTitle} />;
    },
  });

  const Display = (addFolder, openApp, context) => (
    <DynamicDisplay addFolder={addFolder} openApp={openApp} context={context} />
  );

  Display.prefetch = () => {
    if (typeof DynamicDisplay?.preload === 'function') {
      DynamicDisplay.preload();
    }
  };

  return Display;
};

export default createLazyDisplay;
