/* eslint-disable no-top-level-window/no-top-level-window-or-document */

const OFFLINE_READY_APPS = [
  {
    path: '/apps/terminal',
    title: 'Terminal',
    description: 'Launch the simulated shell and local documentation.',
  },
  {
    path: '/apps/2048',
    title: '2048',
    description: 'Keep the puzzle streak going offline.',
  },
  {
    path: '/apps/checkers',
    title: 'Checkers',
    description: 'Challenge the built-in AI board opponent.',
  },
  {
    path: '/apps/sticky_notes',
    title: 'Sticky Notes',
    description: 'Draft notes locally — they stay cached until you reconnect.',
  },
  {
    path: '/apps/minesweeper',
    title: 'Minesweeper',
    description: 'Classic offline logic puzzle.',
  },
  {
    path: '/apps/weather',
    title: 'Weather',
    description: 'Review the last synced forecast snapshot.',
  },
];

const retryButton = document.getElementById('retry');
const appsList = document.getElementById('apps');
const connectionStatus = document.getElementById('connection-status');
const diagnostics = document.getElementById('diagnostics');
const lastChecked = document.getElementById('last-checked');
const desktopLink = document.getElementById('desktop-link');

const stripTrailingSlash = (value) => {
  if (!value || value === '/') return value || '/';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const resolveBasePath = () => {
  const { pathname } = window.location;
  if (!pathname.endsWith('/offline.html')) {
    return '';
  }
  const base = pathname.slice(0, -'/offline.html'.length);
  return stripTrailingSlash(base);
};

const basePath = resolveBasePath();

const withBasePath = (path) => {
  if (!basePath || basePath === '/') {
    return path;
  }
  if (path === '/') return basePath || '/';
  return `${basePath}${path}`;
};

if (desktopLink) {
  desktopLink.setAttribute('href', withBasePath('/'));
}

const updateTimestamps = () => {
  if (lastChecked) {
    const timestamp = new Date().toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
    lastChecked.textContent = `Last checked: ${timestamp}`;
  }
};

const setDiagnostics = (message) => {
  if (diagnostics) {
    diagnostics.textContent = message;
  }
};

const setConnectionStatus = () => {
  if (!connectionStatus) return;
  const online = navigator.onLine;
  connectionStatus.textContent = online
    ? 'You appear to be back online. Reload to resume live data.'
    : 'You are offline. Cached content is serving in the meantime.';
  setDiagnostics(
    online
      ? 'The next refresh will update widgets and analytics.'
      : 'The service worker is answering requests from its local cache.',
  );
  updateTimestamps();
};

const normalizeCachePath = (pathname) => {
  const stripped = stripTrailingSlash(pathname || '/');
  if (!basePath || basePath === '/') return stripped;
  if (stripped.startsWith(basePath)) {
    const remainder = stripped.slice(basePath.length);
    return remainder ? remainder : '/';
  }
  return stripped;
};

const listOfflineApps = async () => {
  if (!appsList) return;
  appsList.innerHTML = '';

  if (typeof caches === 'undefined' || !caches.keys) {
    appsList.innerHTML = '<li>Offline cache is unavailable in this browser.</li>';
    return;
  }

  try {
    const cacheNames = await caches.keys();
    const cachedPaths = new Set();

    await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        requests.forEach((request) => {
          const url = new URL(request.url);
          cachedPaths.add(normalizeCachePath(url.pathname));
        });
      }),
    );

    const availableApps = OFFLINE_READY_APPS.filter((app) =>
      cachedPaths.has(stripTrailingSlash(app.path)),
    );

    if (availableApps.length === 0) {
      appsList.innerHTML = '<li>No cached apps found yet. Launch an app while online to make it available here.</li>';
      return;
    }

    availableApps.forEach((app) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const title = document.createElement('span');
      const description = document.createElement('span');

      link.href = withBasePath(app.path);
      title.textContent = app.title;
      description.textContent = app.description;

      link.appendChild(title);
      link.appendChild(description);
      item.appendChild(link);
      appsList.appendChild(item);
    });
  } catch (error) {
    appsList.innerHTML = '<li>We couldn\'t read the cache contents. Try refreshing once you are online again.</li>';
    console.error('Failed to enumerate offline apps', error);
  }
};

if (retryButton) {
  retryButton.addEventListener('click', () => {
    retryButton.disabled = true;
    retryButton.textContent = 'Retrying…';
    window.location.reload();
  });
}

window.addEventListener('online', () => {
  setConnectionStatus();
  listOfflineApps().catch(() => {
    if (appsList) {
      appsList.innerHTML = '<li>Offline cache is unavailable at the moment.</li>';
    }
  });
});

window.addEventListener('offline', () => {
  setConnectionStatus();
});

setConnectionStatus();
listOfflineApps().catch(() => {
  if (appsList) {
    appsList.innerHTML = '<li>Offline cache is unavailable at the moment.</li>';
  }
});
