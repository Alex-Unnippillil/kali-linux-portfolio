const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function gatherFiles(dirPath, predicate) {
  if (!dirPath || !predicate) return [];
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...gatherFiles(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function computeEtagForFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha1').update(buffer).digest('hex');
  return `"${hash}"`;
}

function buildHeaderEntry({
  publicDir,
  absoluteFile,
  basePath,
  cacheControlValue,
}) {
  const relative = path.relative(publicDir, absoluteFile);
  const routePath = `/${toPosixPath(relative)}`;
  const prefix = basePath && basePath !== '/' ? basePath : '';
  return {
    source: `${prefix}${routePath}`,
    headers: [
      {
        key: 'Cache-Control',
        value: cacheControlValue,
      },
      {
        key: 'ETag',
        value: computeEtagForFile(absoluteFile),
      },
    ],
  };
}

function buildDocsJsonHeaders({
  projectRoot,
  basePath = '',
  cacheControlValue = 'public, max-age=0, stale-while-revalidate=86400',
}) {
  const publicDir = path.join(projectRoot, 'public');
  const docsDir = path.join(publicDir, 'docs');
  const headers = [];

  const docFiles = gatherFiles(docsDir, (file) => file.endsWith('.md'));
  for (const file of docFiles) {
    headers.push(
      buildHeaderEntry({
        publicDir,
        absoluteFile: file,
        basePath,
        cacheControlValue,
      }),
    );
  }

  const jsonFiles = gatherFiles(publicDir, (file) => file.endsWith('.json'));
  for (const file of jsonFiles) {
    headers.push(
      buildHeaderEntry({
        publicDir,
        absoluteFile: file,
        basePath,
        cacheControlValue,
      }),
    );
  }

  return headers;
}

function createDocsJsonRuntimeCaching({ basePath = '', cacheName }) {
  const prefix = basePath && basePath !== '/' ? basePath : '';
  return {
    urlPattern: ({ sameOrigin, url }) => {
      if (!sameOrigin) return false;
      if (prefix && !url.pathname.startsWith(prefix)) {
        return false;
      }
      const trimmed = prefix ? url.pathname.slice(prefix.length) : url.pathname;
      const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      if (normalized.startsWith('/_next/')) return false;
      if (normalized.startsWith('/api/')) return false;
      const isDoc = normalized.startsWith('/docs/') && normalized.endsWith('.md');
      const isJson = normalized.endsWith('.json');
      return isDoc || isJson;
    },
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName,
      cacheableResponse: { statuses: [0, 200] },
      matchOptions: { ignoreVary: true },
    },
  };
}

module.exports = {
  buildDocsJsonHeaders,
  createDocsJsonRuntimeCaching,
};
