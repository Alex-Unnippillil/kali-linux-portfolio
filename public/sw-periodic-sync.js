const TASK_SYNC_TAG = 'task-prefetch';

async function prefetchTasks() {
  try {
    await fetch('https://example.com/api/tasks');
    const ts = Date.now();
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of allClients) {
      client.postMessage({ type: 'last-sync', timestamp: ts });
    }
  } catch (err) {
    console.error('Task prefetch failed', err);
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === TASK_SYNC_TAG) {
    event.waitUntil(prefetchTasks());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'manual-sync') {
    event.waitUntil(prefetchTasks());
  }
});

