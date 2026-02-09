/* eslint-disable no-top-level-window/no-top-level-window-or-document */
document.getElementById('retry').addEventListener('click', () => {
  window.location.reload();
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
