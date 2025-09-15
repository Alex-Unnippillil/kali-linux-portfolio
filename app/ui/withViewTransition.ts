'use client';

const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

/**
 * Runs the provided callback inside a View Transition when supported.
 * Falls back to calling the callback immediately when the API is unavailable or errors.
 */
export const withViewTransition = async (
  callback?: () => void | Promise<void>
): Promise<void> => {
  if (typeof document === 'undefined') {
    await callback?.();
    return;
  }

  const { startViewTransition } = document;

  if (typeof startViewTransition !== 'function') {
    await callback?.();
    return;
  }

  let invoked = false;

  try {
    const transition = startViewTransition(async () => {
      invoked = true;
      await callback?.();
      await waitForNextFrame();
    });

    await transition.finished;
  } catch {
    if (!invoked) {
      await callback?.();
    }
  }
};

export default withViewTransition;
