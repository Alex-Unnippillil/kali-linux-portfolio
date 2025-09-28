/**
 * Global desktop event channel definitions.
 */

/**
 * Custom event fired when desktop windows request the navbar to toggle autohide.
 * @type {string}
 */
export const NAVBAR_AUTOHIDE_EVENT = 'navbar-autohide-change';

/**
 * Dispatches a navbar autohide change event.
 *
 * @param {string | null | undefined} id - Unique window identifier.
 * @param {boolean} hidden - Whether the navbar should hide for the window.
 */
export const dispatchNavbarAutohide = (id, hidden) => {
  if (typeof window === 'undefined' || !id) return;
  try {
    window.dispatchEvent(
      new CustomEvent(NAVBAR_AUTOHIDE_EVENT, {
        detail: { id, hidden },
      }),
    );
  } catch (error) {
    if (typeof document === 'undefined') return;
    const fallback = document.createEvent('CustomEvent');
    fallback.initCustomEvent(NAVBAR_AUTOHIDE_EVENT, false, false, { id, hidden });
    window.dispatchEvent(fallback);
  }
};
