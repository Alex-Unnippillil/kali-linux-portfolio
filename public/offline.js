/* eslint-disable no-top-level-window/no-top-level-window-or-document */
const retryButton = document.getElementById('retry');
const appsList = document.getElementById('apps');
const statusElement = document.getElementById('apps-status');

if (retryButton) {
  retryButton.addEventListener('click', () => {
    retryButton.disabled = true;
    retryButton.textContent = 'Retrying…';
    window.location.reload();
  });
}

const setStatus = (message) => {
  if (statusElement) {
    statusElement.textContent = message;
  }
};

const createMessageItem = (text) => {
  const item = document.createElement('li');
  item.className = 'offline__apps-empty';
  item.textContent = text;
  return item;
};

const formatAppName = (path) => {
  const slug = path.replace('/apps/', '').replace(/\/index$/, '');
  return slug
    .split(/[-_/]/)
    .filter(Boolean)
    .map((segment) => segment.replace(/_/g, ' ').trim())
    .filter(Boolean)
    .map((segment) => {
      if (segment.length <= 3 && /^[a-zA-Z]+$/.test(segment)) {
        return segment.toUpperCase();
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(' ');
};

const populateCachedApps = async () => {
  if (!appsList) {
    return;
  }

  if (!('caches' in window)) {
    setStatus('Caching is unavailable in this browser.');
    appsList.innerHTML = '';
    appsList.appendChild(createMessageItem('Your browser does not support offline caches.'));
    return;
  }

  setStatus('Scanning cached apps…');

  try {
    const cacheNames = await caches.keys();
    const appEntries = new Map();

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const requests = await cache.keys();

      for (const request of requests) {
        const url = new URL(request.url);
        if (url.origin !== window.location.origin) {
          continue;
        }
        if (!url.pathname.startsWith('/apps/') || url.pathname.endsWith('.js')) {
          continue;
        }

        const normalizedPath = url.pathname.replace(/\/index$/, '');
        if (appEntries.has(normalizedPath)) {
          continue;
        }

        let title = formatAppName(normalizedPath);
        try {
          const response = await cache.match(request);
          if (
            response &&
            response.ok &&
            response.headers.get('content-type') &&
            response.headers.get('content-type').includes('text/html')
          ) {
            const text = await response.clone().text();
            const match = text.match(/<title>([^<]*)<\/title>/i);
            if (match && match[1]) {
              title = match[1].split('|')[0].trim();
            }
          }
        } catch (err) {
          // Ignore errors when inspecting cached responses.
        }

        appEntries.set(normalizedPath, title);
      }
    }

    appsList.innerHTML = '';

    if (appEntries.size === 0) {
      setStatus('No cached apps yet.');
      appsList.appendChild(
        createMessageItem('Launch an app while you are online to make it available offline.'),
      );
      return;
    }

    setStatus('Available offline');

    const fragment = document.createDocumentFragment();
    Array.from(appEntries.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([path, title]) => {
        const item = document.createElement('li');
        item.className = 'offline__apps-item';
        const link = document.createElement('a');
        link.href = path;
        link.textContent = title;
        item.appendChild(link);
        fragment.appendChild(item);
      });

    appsList.appendChild(fragment);
  } catch (error) {
    setStatus('Unable to access caches.');
    appsList.innerHTML = '';
    appsList.appendChild(createMessageItem('Cached app data is unavailable right now.'));
  }
};

populateCachedApps();
