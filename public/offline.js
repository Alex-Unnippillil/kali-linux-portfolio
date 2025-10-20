/* eslint-disable no-top-level-window/no-top-level-window-or-document */
const retryButton = document.getElementById('retry');
if (retryButton) {
  retryButton.addEventListener('click', () => {
    window.location.reload();
  });
}

const getListElement = (id) => document.getElementById(id);

const renderLinks = (element, links, emptyMessage) => {
  if (!element) return;
  element.innerHTML = '';
  if (!links.length) {
    element.innerHTML = `<li>${emptyMessage}</li>`;
    return;
  }

  links.forEach(({ href, label }) => {
    const li = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = label;
    li.appendChild(anchor);
    element.appendChild(li);
  });
};

const readFromCaches = async (callback) => {
  const names = await caches.keys();
  for (const name of names) {
    const cache = await caches.open(name);
    const result = await callback(cache);
    if (result) {
      return result;
    }
  }
  return null;
};

const renderApps = async () => {
  const list = getListElement('apps');
  if (!list) return;
  try {
    const urls = await readFromCaches(async (cache) => {
      const keys = await cache.keys();
      const matches = [];
      keys.forEach((request) => {
        const url = new URL(request.url);
        if (url.pathname.startsWith('/apps/') && !url.pathname.endsWith('.js')) {
          matches.push(url.pathname);
        }
      });
      return matches.length ? matches : null;
    });

    if (!urls || !urls.length) {
      renderLinks(list, [], 'No apps available offline.');
      return;
    }

    const links = Array.from(new Set(urls)).map((path) => ({
      href: path,
      label: path.replace('/apps/', ''),
    }));
    renderLinks(list, links, 'No apps available offline.');
  } catch (error) {
    list.innerHTML = '<li>Unable to access cached apps.</li>';
  }
};

const renderDocs = async () => {
  const list = getListElement('docs');
  if (!list) return;
  try {
    const docs = await readFromCaches((cache) => cache.match('/docs/index.json'));
    if (!docs) {
      renderLinks(list, [], 'No docs cached.');
      return;
    }
    const entries = await docs.clone().json();
    if (!Array.isArray(entries) || !entries.length) {
      renderLinks(list, [], 'No docs cached.');
      return;
    }
    const links = entries.map((entry) => ({
      href: entry.path,
      label: entry.title || entry.id,
    }));
    renderLinks(list, links, 'No docs cached.');
  } catch (error) {
    list.innerHTML = '<li>Unable to access cached docs.</li>';
  }
};

const renderRoutes = async () => {
  const list = getListElement('routes');
  if (!list) return;
  try {
    const sitemapResponse = await readFromCaches((cache) => cache.match('/sitemap.xml'));
    if (!sitemapResponse) {
      renderLinks(list, [], 'No pages cached.');
      return;
    }
    const xml = await sitemapResponse.clone().text();
    const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
    const paths = new Set();
    matches.forEach((match) => {
      const value = match[1];
      try {
        const url = new URL(value, window.location.origin);
        if (url.pathname) {
          paths.add(url.pathname);
        }
      } catch {
        if (value.startsWith('/')) {
          paths.add(value);
        }
      }
    });
    const links = Array.from(paths).map((path) => ({
      href: path,
      label: path || '/',
    }));
    renderLinks(list, links, 'No pages cached.');
  } catch (error) {
    list.innerHTML = '<li>Unable to access cached pages.</li>';
  }
};

(async () => {
  await Promise.all([renderApps(), renderDocs(), renderRoutes()]);
})();
