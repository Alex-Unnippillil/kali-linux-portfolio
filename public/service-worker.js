self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      self.clients.claim();
      try {
        await fetch('/api/inbox/unread-count');
      } catch (err) {
        // ignore errors from background fetch
      }
    })(),
  );
});
