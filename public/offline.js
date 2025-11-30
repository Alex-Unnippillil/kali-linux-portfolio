/* eslint-disable no-top-level-window/no-top-level-window-or-document */
const offlinePageName = 'offline.html';

function getBasePath() {
  const { pathname } = window.location;
  if (!pathname) return '';

  if (pathname.endsWith(`/${offlinePageName}`)) {
    const withoutPage = pathname.slice(0, -offlinePageName.length - 1);
    return withoutPage === '/' ? '' : withoutPage;
  }

  if (pathname.endsWith(offlinePageName)) {
    const withoutPage = pathname.slice(0, -offlinePageName.length);
    if (withoutPage === '/' || withoutPage === '') {
      return '';
    }
    return withoutPage.endsWith('/') ? withoutPage.slice(0, -1) : withoutPage;
  }

  const directory = pathname.replace(/\/?[^/]*$/, '');
  if (directory === '/' || directory === '') {
    return '';
  }
  return directory.endsWith('/') ? directory.slice(0, -1) : directory;
}

const basePath = getBasePath();
const basePathPrefix = basePath || '';

function formatAppLabel(path) {
  return path.replace(/^\/apps\//, '').replace(/\/$/, '') || 'home';
}

document.getElementById('retry').addEventListener('click', () => {
  window.location.reload();
});

(async () => {
  const list = document.getElementById('apps');
  list.innerHTML = '';
  try {
    const names = await caches.keys();
    const urls = new Set();
    const appsPrefix = `${basePathPrefix}/apps/`;

    for (const name of names) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      for (const request of keys) {
        const url = new URL(request.url);
        const { pathname } = url;
        if (pathname.startsWith(appsPrefix) && !pathname.endsWith('.js')) {
          const appPath = pathname.slice(basePathPrefix.length);
          urls.add(appPath);
        }
      }
    }

    if (urls.size === 0) {
      list.innerHTML = '<li>No apps available offline.</li>';
      return;
    }

    urls.forEach((relativePath) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `${basePathPrefix}${relativePath}`;
      a.textContent = formatAppLabel(relativePath);
      li.appendChild(a);
      list.appendChild(li);
    });
  } catch (err) {
    console.warn('Unable to enumerate cached apps', err);
    list.innerHTML = '<li>Unable to access cached apps.</li>';
  }
})();
