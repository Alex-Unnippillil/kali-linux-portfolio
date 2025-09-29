const CONTACT_QUEUE_DB = 'contact-draft-queue';
const CONTACT_QUEUE_STORE = 'drafts';
const CONTACT_QUEUE_VERSION = 1;
const CONTACT_SYNC_TAG = 'contact-draft-sync';

const STATUS_QUEUED = 'queued';
const STATUS_SENDING = 'sending';
const STATUS_ERROR = 'error';

function openContactDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONTACT_QUEUE_DB, CONTACT_QUEUE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONTACT_QUEUE_STORE)) {
        db.createObjectStore(CONTACT_QUEUE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, operation) {
  const db = await openContactDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONTACT_QUEUE_STORE, mode);
    const store = tx.objectStore(CONTACT_QUEUE_STORE);
    let opResult;
    tx.oncomplete = () => {
      db.close();
      resolve(opResult);
    };
    const fail = (error) => {
      db.close();
      reject(error || tx.error);
    };
    tx.onabort = () => fail(tx.error);
    tx.onerror = () => fail(tx.error);
    Promise.resolve()
      .then(() => operation(store, tx))
      .then((result) => {
        opResult = result;
      })
      .catch((error) => {
        fail(error);
        try {
          tx.abort();
        } catch (abortErr) {
          // ignore abort errors
        }
      });
  });
}

function createRecordId() {
  if (typeof self.crypto?.randomUUID === 'function') {
    return self.crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function addDraft(record) {
  await withStore('readwrite', (store) => {
    store.put(record);
  });
}

async function getDraft(id) {
  return withStore('readonly', (store) => {
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  });
}

async function getAllDrafts() {
  return withStore('readonly', (store) => {
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error);
    });
  });
}

async function deleteDraft(id) {
  await withStore('readwrite', (store) => {
    store.delete(id);
  });
}

async function updateDraft(id, updates) {
  const draft = await getDraft(id);
  if (!draft) return null;
  const next = {
    ...draft,
    ...updates,
    updatedAt: Date.now(),
  };
  await addDraft(next);
  return next;
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage({
      source: 'contact-draft-queue',
      ...message,
    });
  }
}

async function readJsonBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await request.clone().json();
  } catch (error) {
    return null;
  }
}

async function queueContactRequest(request) {
  const payload = await readJsonBody(request);
  if (!payload) {
    return new Response(
      JSON.stringify({ success: false, error: 'Draft could not be saved offline.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const record = {
    id: createRecordId(),
    payload,
    status: STATUS_QUEUED,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attempts: 0,
  };

  await addDraft(record);
  await notifyClients({ type: 'CONTACT_DRAFT_QUEUED', record });

  if (self.registration?.sync && typeof self.registration.sync.register === 'function') {
    try {
      await self.registration.sync.register(CONTACT_SYNC_TAG);
    } catch (error) {
      // ignore registration failures
    }
  }

  return new Response(
    JSON.stringify({ queued: true, id: record.id, queuedAt: record.createdAt }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

async function replayDraft(record) {
  const payload = record.payload;
  const body = JSON.stringify(payload);
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Background-Sync': 'contact-draft',
    },
    body,
  });
  return response;
}

async function processQueue() {
  const drafts = await getAllDrafts();
  let hadFailure = false;

  for (const draft of drafts) {
    if (draft.status !== STATUS_QUEUED && draft.status !== STATUS_ERROR) {
      continue;
    }
    await updateDraft(draft.id, { status: STATUS_SENDING, attempts: (draft.attempts || 0) + 1, lastTriedAt: Date.now() });
    try {
      const response = await replayDraft(draft);
      if (response.ok) {
        await deleteDraft(draft.id);
        await notifyClients({ type: 'CONTACT_DRAFT_SENT', id: draft.id });
        continue;
      }
      hadFailure = true;
      const statusText = `HTTP_${response.status}`;
      await updateDraft(draft.id, { status: STATUS_ERROR, lastError: statusText });
      await notifyClients({ type: 'CONTACT_DRAFT_FAILED', id: draft.id, reason: statusText });
    } catch (error) {
      hadFailure = true;
      const reason = error?.message || 'NETWORK_ERROR';
      await updateDraft(draft.id, { status: STATUS_ERROR, lastError: reason, lastTriedAt: Date.now() });
      await notifyClients({ type: 'CONTACT_DRAFT_FAILED', id: draft.id, reason });
    }
  }

  if (hadFailure) {
    throw new Error('One or more drafts failed to submit');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'POST') return;
  const url = new URL(request.url);
  if (url.pathname !== '/api/contact') return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request.clone());
        return response;
      } catch (error) {
        return queueContactRequest(request);
      }
    })(),
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === CONTACT_SYNC_TAG) {
    event.waitUntil(
      processQueue().catch(() => {
        // Rethrow to requeue sync attempts
        throw new Error('CONTACT_DRAFT_SYNC_RETRY');
      }),
    );
  }
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'CONTACT_DRAFTS_REQUEST') {
    event.waitUntil(
      getAllDrafts().then((drafts) => {
        const payload = {
          type: 'CONTACT_DRAFTS_RESPONSE',
          drafts,
        };
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage(payload);
        } else if (event.source && 'postMessage' in event.source) {
          event.source.postMessage(payload);
        }
      }),
    );
  }
  if (data.type === 'CONTACT_DRAFT_DELETE' && data.id) {
    event.waitUntil(
      deleteDraft(data.id).then(() => notifyClients({ type: 'CONTACT_DRAFT_REMOVED', id: data.id })),
    );
  }
});

