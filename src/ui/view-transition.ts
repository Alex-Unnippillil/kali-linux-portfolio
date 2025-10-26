const PREFERS_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type MaybePromise<T> = T | Promise<T>;

type ViewTransitionCallback = () => void | Promise<void>;

interface ViewTransitionLike {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
}

interface DocumentWithViewTransition extends Document {
  startViewTransition?: (callback: ViewTransitionCallback) => ViewTransitionLike;
}

const isBrowserEnvironment = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

const prefersReducedMotion = (): boolean => {
  if (!isBrowserEnvironment()) {
    return false;
  }

  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(PREFERS_REDUCED_MOTION_QUERY).matches;
};

export function withViewTransition<TArgs extends unknown[]>(
  callback: (...args: TArgs) => MaybePromise<unknown>,
): (...args: TArgs) => void {
  return (...args: TArgs) => {
    const runNavigation = () => callback(...args);

    if (!isBrowserEnvironment()) {
      runNavigation();
      return;
    }

    const doc = document as DocumentWithViewTransition;

    if (typeof doc.startViewTransition !== 'function') {
      runNavigation();
      return;
    }

    if (prefersReducedMotion()) {
      runNavigation();
      return;
    }

    doc.startViewTransition(async () => {
      await runNavigation();
    });
  };
}
