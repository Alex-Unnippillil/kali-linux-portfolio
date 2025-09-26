let axeInitPromise;

/**
 * Lazily loads @axe-core/react during development to audit accessibility issues.
 * Subsequent calls reuse the same initialization promise.
 *
 * @param {typeof import('react')} ReactInstance React module reference from the caller.
 * @returns {Promise<void> | undefined}
 */
export const initAxe = (ReactInstance) => {
  if (process.env.NODE_ENV !== 'development') {
    return undefined;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  if (!axeInitPromise) {
    axeInitPromise = import('@axe-core/react')
      .then(async (axeModule) => {
        const axe = axeModule.default ?? axeModule;
        const ReactDOM = await import('react-dom');
        await axe(ReactInstance, ReactDOM, 1000);
      })
      .catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[axe-core] Failed to initialize accessibility checks', error);
        }
      });
  }

  return axeInitPromise;
};
