#!/usr/bin/env node
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import waitOn from 'wait-on';

import { collectChangedFiles } from './utils/collect-changed-files.mjs';

const substituteDynamicSegment = (segment) => {
  if (!segment) {
    return segment;
  }

  if (segment.startsWith('(') && segment.endsWith(')')) {
    return '';
  }

  if (segment.startsWith('@')) {
    return '';
  }

  if (segment.startsWith('[')) {
    return 'sample';
  }

  return segment;
};

const toPagesRoute = (file) => {
  if (!file.startsWith('pages/')) {
    return null;
  }

  if (file.startsWith('pages/api/')) {
    return null;
  }

  const extension = path.extname(file);
  if (!['.js', '.jsx', '.ts', '.tsx', '.mdx', '.mjs', '.cjs'].includes(extension)) {
    return null;
  }

  const relative = file.slice('pages/'.length);
  if (relative.startsWith('_')) {
    return null;
  }

  const withoutExt = relative.replace(/\.[^.]+$/, '');
  const segments = withoutExt.split('/').map(substituteDynamicSegment).filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  if (segments[segments.length - 1] === 'index') {
    segments.pop();
  }

  if (segments.length === 0) {
    return '/';
  }

  return `/${segments.join('/')}`.replace(/\/+/g, '/');
};

const toAppRoute = (file) => {
  if (!file.startsWith('app/')) {
    return null;
  }

  if (!/\/(page|default)\.[jt]sx?$/.test(file)) {
    return null;
  }

  const parts = file.slice('app/'.length).split('/');
  const segments = parts
    .slice(0, -1)
    .map(substituteDynamicSegment)
    .filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  return `/${segments.join('/')}`.replace(/\/+/g, '/');
};

const deriveRoutes = (files) => {
  const routes = new Set();
  let requiresDefaultRoutes = false;

  for (const file of files) {
    const pagesRoute = toPagesRoute(file);
    if (pagesRoute) {
      routes.add(pagesRoute);
      continue;
    }

    const appRoute = toAppRoute(file);
    if (appRoute) {
      routes.add(appRoute);
      continue;
    }

    if (
      file.startsWith('components/') ||
      file.startsWith('templates/') ||
      file.startsWith('styles/') ||
      file.startsWith('hooks/') ||
      file.startsWith('public/')
    ) {
      requiresDefaultRoutes = true;
      if (file.includes('/apps')) {
        routes.add('/apps');
      }
    }
  }

  if (requiresDefaultRoutes) {
    routes.add('/');
  }

  return Array.from(routes);
};

const startDevServer = async (port) => {
  const server = spawn('yarn', ['dev', '-p', String(port)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      BROWSER: 'none',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  });

  await waitOn({ resources: [`http://127.0.0.1:${port}`], timeout: 60000 });

  return server;
};

const runPa11y = (urls, port) => {
  const result = spawnSync('yarn', ['a11y'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      BASE_URL: `http://127.0.0.1:${port}`,
      A11Y_URLS: JSON.stringify(urls),
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const run = async () => {
  const rawArgs = process.argv.slice(2);
  let stagedOnly = false;
  let since;

  for (const arg of rawArgs) {
    if (arg === '--staged') {
      stagedOnly = true;
    } else if (arg.startsWith('--since=')) {
      since = arg.slice('--since='.length);
    }
  }

  const files = collectChangedFiles({
    stagedOnly,
    since,
    normalize: true,
  });
  const routes = deriveRoutes(files);

  if (routes.length === 0) {
    console.log('No changed UI routes detected. Skipping targeted accessibility scan.');
    return;
  }

  const port = Number(process.env.A11Y_PORT ?? 4123);
  const baseUrl = `http://127.0.0.1:${port}`;
  const maxRoutes = Number(process.env.A11Y_MAX_ROUTES ?? 5);
  const selectedRoutes = routes.slice(0, maxRoutes);
  const urls = selectedRoutes.map((route) => `${baseUrl}${route}`);

  if (routes.length > selectedRoutes.length) {
    console.log(`Scanning first ${selectedRoutes.length} of ${routes.length} detected routes.`);
  }

  let server;

  try {
    server = await startDevServer(port);
    runPa11y(urls, port);
  } finally {
    if (server) {
      server.kill('SIGTERM');
    }
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

