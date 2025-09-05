import { publish } from './pubsub';

/**
 * Shim for the `xflock4` command used in XFCE to lock the session.
 * When invoked, publishes a `session:lock` event that components can
 * listen for to display the lock screen.
 */
export default function xflock4(): void {
  publish('session:lock', null);
}

// Expose globally for shell/console access in the browser
if (typeof globalThis !== 'undefined') {
  (globalThis as any).xflock4 = xflock4;
}
