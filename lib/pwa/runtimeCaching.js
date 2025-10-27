function ensureLeadingSlash(path) {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function joinWithBasePath(normalizedBasePath, path) {
  const normalizedPath = ensureLeadingSlash(path);
  if (!normalizedBasePath || normalizedBasePath === '/') {
    return normalizedPath;
  }
  return `${normalizedBasePath}${normalizedPath}`;
}

function createProjectsRuntimeCaching({ buildAwareCacheName, normalizedBasePath }) {
  const projectsPath = joinWithBasePath(normalizedBasePath, '/projects.json');
  return {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname === projectsPath,
    handler: 'NetworkFirst',
    options: {
      cacheName: buildAwareCacheName('projects-data'),
      expiration: {
        maxEntries: 1,
        maxAgeSeconds: 60 * 60 * 12,
        purgeOnQuotaError: true,
      },
    },
  };
}

function createIconsRuntimeCaching({ buildAwareCacheName, normalizedBasePath }) {
  const iconsPrefix = `${joinWithBasePath(normalizedBasePath, '/icons')}/`;
  return {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith(iconsPrefix),
    handler: 'CacheFirst',
    options: {
      cacheName: buildAwareCacheName('icon-assets'),
      expiration: {
        maxEntries: 80,
        purgeOnQuotaError: true,
      },
    },
  };
}

function createDocsRuntimeCaching({ buildAwareCacheName, normalizedBasePath }) {
  const docsPrefix = `${joinWithBasePath(normalizedBasePath, '/docs')}/`;
  return {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith(docsPrefix),
    handler: 'NetworkFirst',
    options: {
      cacheName: buildAwareCacheName('doc-pages'),
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
        purgeOnQuotaError: true,
      },
    },
  };
}

function createCustomRuntimeCaching({ buildAwareCacheName, normalizedBasePath }) {
  return [
    createProjectsRuntimeCaching({ buildAwareCacheName, normalizedBasePath }),
    createIconsRuntimeCaching({ buildAwareCacheName, normalizedBasePath }),
    createDocsRuntimeCaching({ buildAwareCacheName, normalizedBasePath }),
  ];
}

module.exports = {
  ensureLeadingSlash,
  joinWithBasePath,
  createProjectsRuntimeCaching,
  createIconsRuntimeCaching,
  createDocsRuntimeCaching,
  createCustomRuntimeCaching,
};
