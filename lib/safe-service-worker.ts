/**
 * Register the generated service worker only when it exists on the server.
 *
 * A HEAD request is made first to avoid errors when the service worker file is
 * missing (for example during static exports where no SW is produced).
 */
export async function safeRegisterSW() {
  // Service workers are only enabled in production and in browsers that support them
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const swUrl = '/sw.js';

    // Ensure the service worker file exists before attempting registration
    const headResp = await fetch(swUrl, { method: 'HEAD' });
    if (!headResp.ok) return;

    const registration = await navigator.serviceWorker.register(swUrl);

    // Expose a manual refresh helper used elsewhere in the app
    // to trigger an update check for the service worker
    (window as any).manualRefresh = () => registration.update();

    if ('periodicSync' in registration) {
      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        if (status.state === 'granted') {
          await registration.periodicSync.register('content-sync', {
            minInterval: 24 * 60 * 60 * 1000,
          });
        } else {
          registration.update();
        }
      } catch {
        registration.update();
      }
    } else {
      registration.update();
    }
  } catch (err) {
    console.error('Service worker setup failed', err);
  }
}

