export type ViewTransitionCallback = () => void | Promise<void>;

const reduceMotionQuery = '(prefers-reduced-motion: reduce)';

type DocumentWithViewTransition = Document & {
  startViewTransition?: (
    callback: () => void | Promise<void>,
  ) => ViewTransition;
};

export function withViewTransition<T extends ViewTransitionCallback>(
  callback: T,
): ReturnType<T> | ViewTransition {
  if (typeof document === 'undefined') {
    return callback();
  }

  const doc = document as DocumentWithViewTransition;
  const startTransition = doc.startViewTransition?.bind(doc);

  if (typeof startTransition !== 'function') {
    return callback();
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(reduceMotionQuery).matches;

  if (prefersReducedMotion) {
    return callback();
  }

  return startTransition(() => {
    try {
      return Promise.resolve(callback());
    } catch (error) {
      return Promise.reject(error);
    }
  });
}
