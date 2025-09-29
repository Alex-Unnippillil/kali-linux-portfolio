/* eslint-disable no-top-level-window/no-top-level-window-or-document */
const STATUS_STORAGE_KEY = 'pwa:lastStatus';
const STATUS_CHANNEL = 'pwa-status';

const retryButton = document.getElementById('retry');
const statusCard = document.getElementById('pwa-status');
const statusMessage = document.getElementById('pwa-status-message');
const installButton = document.getElementById('pwa-install');
const reloadButton = document.getElementById('pwa-reload');

const DEFAULT_MESSAGES = {
  'install-ready': 'Install this app to unlock offline access.',
  installed: 'App installed. You can launch it from your home screen.',
  'update-ready': 'An update is ready. Reload to apply it.',
  updated: 'You are running the latest version.',
};

const parseStatus = (value) => {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.type !== 'string') return null;
    if (!(parsed.type in DEFAULT_MESSAGES)) return null;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored status', error);
    return null;
  }
};

const updateStatusUI = (status) => {
  const message = status?.message || DEFAULT_MESSAGES[status?.type];
  if (message) {
    statusCard.hidden = false;
    statusMessage.textContent = message;
  } else {
    statusCard.hidden = true;
    statusMessage.textContent = '';
  }

  const action = status?.action;
  const shouldShowInstall = action === 'install';
  const shouldShowReload = action === 'reload';

  installButton.hidden = !shouldShowInstall;
  installButton.disabled = !navigator.onLine;
  reloadButton.hidden = !shouldShowReload;

  retryButton.hidden = shouldShowReload;
};

const readStatus = () => {
  try {
    const stored = window.localStorage?.getItem(STATUS_STORAGE_KEY);
    return parseStatus(stored);
  } catch (error) {
    console.warn('Unable to read stored PWA status', error);
    return null;
  }
};

const applyStoredStatus = () => {
  const status = readStatus();
  updateStatusUI(status);
};

retryButton.addEventListener('click', () => {
  window.location.reload();
});

installButton.addEventListener('click', () => {
  window.location.href = '/';
});

reloadButton.addEventListener('click', () => {
  window.location.reload();
});

applyStoredStatus();

try {
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(STATUS_CHANNEL);
    const listener = (event) => {
      const status = parseStatus(event?.data);
      if (status) updateStatusUI(status);
    };
    channel.addEventListener('message', listener);
    window.addEventListener('pagehide', () => {
      channel.removeEventListener('message', listener);
      channel.close();
    });
  }
} catch (error) {
  console.warn('Broadcast channel unavailable for offline status sync', error);
}

window.addEventListener('storage', (event) => {
  if (event.key === STATUS_STORAGE_KEY) {
    const status = parseStatus(event.newValue);
    if (status) updateStatusUI(status);
  }
});

(async () => {
  const list = document.getElementById('apps');
  try {
    const names = await caches.keys();
    const urls = new Set();
    for (const name of names) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      for (const request of keys) {
        const url = new URL(request.url);
        if (url.pathname.startsWith('/apps/') && !url.pathname.endsWith('.js')) {
          urls.add(url.pathname);
        }
      }
    }
    if (urls.size === 0) {
      list.innerHTML = '<li>No apps available offline.</li>';
    } else {
      urls.forEach((path) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = path;
        a.textContent = path.replace('/apps/', '');
        li.appendChild(a);
        list.appendChild(li);
      });
    }
  } catch (err) {
    list.innerHTML = '<li>Unable to access cached apps.</li>';
  }
})();
