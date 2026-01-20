import React from 'react';
import dynamic, { DynamicOptionsLoadingProps } from 'next/dynamic';
import ErrorBoundary from '../components/core/ErrorBoundary';
import { logEvent } from './analytics';

type ComponentType = React.ComponentType<any>;
type LoaderResult = ComponentType | { default?: ComponentType; [key: string]: unknown };
type Loader = () => Promise<LoaderResult> | LoaderResult;

const RESERVED_CONTEXT_KEYS = new Set(['addFolder', 'openApp', 'context']);
const BLOCKED_CONTEXT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isComponentType = (value: unknown): value is ComponentType => {
  if (typeof value === 'function') {
    return true;
  }

  return Boolean(
    value &&
      typeof value === 'object' &&
      '$$typeof' in (value as { $$typeof?: unknown }),
  );
};

const resolveComponent = (modOrComponent: LoaderResult, title: string): ComponentType => {
  if (isComponentType(modOrComponent)) {
    return modOrComponent;
  }

  if (modOrComponent && typeof modOrComponent === 'object') {
    const moduleExports = modOrComponent as Record<string, unknown>;
    if (isComponentType(moduleExports.default)) {
      return moduleExports.default;
    }

    const namedComponent = Object.keys(moduleExports)
      .filter((key) => key !== 'default')
      .map((key) => moduleExports[key])
      .find(isComponentType);

    if (namedComponent) {
      return namedComponent;
    }
  }

  throw new Error(`createDynamicApp could not resolve a component for "${title}".`);
};

const sanitizeContextProps = (context: unknown) => {
  if (!context || typeof context !== 'object') {
    return undefined;
  }

  const proto = Object.getPrototypeOf(context);
  if (proto !== Object.prototype && proto !== null) {
    return undefined;
  }

  const safeProps: Record<string, unknown> = {};
  Object.keys(context as Record<string, unknown>).forEach((key) => {
    if (BLOCKED_CONTEXT_KEYS.has(key) || RESERVED_CONTEXT_KEYS.has(key)) {
      return;
    }

    safeProps[key] = (context as Record<string, unknown>)[key];
  });

  return Object.keys(safeProps).length > 0 ? safeProps : undefined;
};

const LoadingState = ({ title }: { title: string }) => (
  <div
    className="flex h-full w-full items-center justify-center gap-3 bg-ub-cool-grey text-white"
    role="status"
    aria-live="polite"
  >
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white border-t-transparent motion-safe:animate-spin"
      aria-hidden="true"
    />
    <span className="text-sm font-medium">{`Loading ${title}...`}</span>
  </div>
);

const ErrorState = ({
  title,
  retry,
}: {
  title: string;
  retry?: DynamicOptionsLoadingProps['retry'];
}) => {
  const reloadPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleRetry = () => {
    if (typeof retry === 'function') {
      retry();
    } else {
      reloadPage();
    }
  };

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4 bg-ub-cool-grey px-6 py-4 text-center text-white"
      role="alert"
      aria-live="assertive"
    >
      <div>
        <p className="text-base font-semibold">{`Unable to load ${title}.`}</p>
        <p className="mt-1 text-sm text-white/80">
          Please try again or reload the desktop.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleRetry}
          className="rounded border border-white/60 px-3 py-1 text-sm font-medium text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubt-gedit-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ub-cool-grey"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={reloadPage}
          className="rounded border border-white/60 px-3 py-1 text-sm font-medium text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubt-gedit-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ub-cool-grey"
        >
          Reload
        </button>
      </div>
    </div>
  );
};

/**
 * Create a lazily loaded app component.
 *
 * IMPORTANT: Pass a *static* loader function (e.g. `() => import('./components/apps/terminal')`).
 * Avoid variable-path imports (like `import(\`../components/apps/${id}\`)`) because they force
 * webpack to build a large context module and dramatically slow down dev compilation.
 */
export const createDynamicApp = (loader: Loader, title: string) =>
  dynamic(
    async () => {
      if (typeof loader !== 'function') {
        throw new Error(
          `createDynamicApp expected a loader function for "${title}". Received: ${typeof loader}`,
        );
      }

      const modOrComponent = await loader();
      const Component = resolveComponent(modOrComponent, title);
      logEvent({ category: 'Application', action: `Loaded ${title}` });
      return Component;
    },
    {
      ssr: false,
      loading: ({ error, retry }: DynamicOptionsLoadingProps) =>
        error ? <ErrorState title={title} retry={retry} /> : <LoadingState title={title} />,
    },
  );

export const createDisplay = (Component: ComponentType) => {
  const DynamicComponent = dynamic(() => Promise.resolve(Component), { ssr: false });
  const Display = (addFolder: unknown, openApp: unknown, context: unknown) => {
    const safeProps = sanitizeContextProps(context);
    return (
      <ErrorBoundary>
        <DynamicComponent
          addFolder={addFolder}
          openApp={openApp}
          context={context}
          {...(safeProps || {})}
        />
      </ErrorBoundary>
    );
  };

  Display.prefetch = () => {
    const prefetchable = Component as ComponentType & { preload?: () => void };
    if (typeof prefetchable.preload === 'function') {
      prefetchable.preload();
    }
  };

  return Display;
};
