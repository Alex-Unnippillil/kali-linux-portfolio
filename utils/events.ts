/**
 * Shared custom events for window interactions.
 *
 * `onSnap` is fired whenever a window component snaps to an edge. Apps can
 * listen for this event to adjust their layout or resize logic.
 *
 * @example
 * window.addEventListener(SNAP_EVENT, () => {
 *   // respond to snap
 * });
 */
export const SNAP_EVENT = 'onSnap';

export interface SnapEventDetail {
  id?: string;
  position?: string | null;
}

/**
 * Emit a snap event so that applications can react to window snapping.
 */
export const emitSnap = (detail: SnapEventDetail): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SNAP_EVENT, { detail }));
  }
};
