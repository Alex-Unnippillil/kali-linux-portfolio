/**
 * Minimal window manager helper to toggle the "show desktop" behaviour.
 *
 * The function hides every element with the attribute `data-window-id`
 * (or, as a fallback, every element with the class `window`).  A record of
 * the previous minimised state is stored so that a subsequent invocation
 * will restore only those windows that were visible when the desktop was
 * shown.
 *
 * In addition to minimising windows the function will also toggle the
 * visibility of an element representing the task list.  By default the
 * element with `[data-tasklist]` is used, but a specific element can be
 * provided via the `tasklist` option.
 */

export interface ShowDesktopOptions {
  /**
   * Optional list of window elements.  When omitted all elements matching
   * `[data-window-id]` or the `.window` class are used.
   */
  windows?: HTMLElement[];

  /** Element representing the task list. */
  tasklist?: HTMLElement | null;
}

// Internal cache of window visibility so we can restore them on the next run.
let previousState: Record<string, boolean> | null = null;

/**
 * Toggle the desktop view. The first call minimises all windows and hides the
 * task list, while the second call restores any windows that were previously
 * visible and shows the task list again.
 */
export default function showDesktop(options: ShowDesktopOptions = {}): void {
  const tasklist =
    options.tasklist ??
    (document.querySelector('[data-tasklist]') as HTMLElement | null);

  const windows =
    options.windows ??
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-window-id], .window'
      )
    );

  if (previousState === null) {
    // Save current minimised state and hide every window.
    previousState = {};
    windows.forEach((w) => {
      const id = w.dataset.windowId || w.id;
      previousState![id] = w.classList.contains('minimized');
      if (!previousState![id]) {
        w.classList.add('minimized');
        // `display: none` keeps things simple for tests and DOM.
        w.style.display = 'none';
      }
    });
    if (tasklist) {
      tasklist.style.display = 'none';
    }
    return;
  }

  // Restore windows that we minimised previously
  windows.forEach((w) => {
    const id = w.dataset.windowId || w.id;
    const wasMinimized = previousState![id];
    if (!wasMinimized) {
      w.classList.remove('minimized');
      w.style.display = '';
    }
  });

  if (tasklist) {
    tasklist.style.display = '';
  }

  previousState = null;
}

/**
 * Helper primarily for tests to reset the internal cached state.
 */
export function resetShowDesktopState() {
  previousState = null;
}

