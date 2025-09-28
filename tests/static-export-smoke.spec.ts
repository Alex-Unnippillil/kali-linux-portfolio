import { test, expect } from '@playwright/test';
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import type { AddressInfo } from 'net';

const contentTypes: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  ico: 'image/x-icon',
  txt: 'text/plain; charset=utf-8',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
  webmanifest: 'application/manifest+json',
  wasm: 'application/wasm',
  map: 'application/json',
};

const outDir = path.join(process.cwd(), 'out');
let baseUrl = '';
const server = createServer(async (req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }
  const url = new URL(req.url, 'http://127.0.0.1');
  const rawPath = decodeURIComponent(url.pathname);
  let cleanPath = rawPath.replace(/^\/+/u, '');
  if (!cleanPath) {
    cleanPath = 'index';
  }
  const candidatePath = path.normalize(path.join(outDir, cleanPath));
  if (!candidatePath.startsWith(outDir)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  const potentialPaths = new Set<string>([candidatePath]);
  if (!path.extname(cleanPath)) {
    potentialPaths.add(path.normalize(path.join(outDir, `${cleanPath}.html`)));
    potentialPaths.add(path.normalize(path.join(outDir, cleanPath, 'index.html')));
  }

  let filePath: string | null = null;
  try {
    for (const attempt of potentialPaths) {
      if (!attempt.startsWith(outDir)) continue;
      const stats = await stat(attempt).catch(() => null);
      if (!stats) continue;
      if (stats.isDirectory()) {
        const indexPath = path.join(attempt, 'index.html');
        const indexStats = await stat(indexPath).catch(() => null);
        if (indexStats) {
          filePath = indexPath;
          break;
        }
        continue;
      }
      filePath = attempt;
      break;
    }
    if (!filePath) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const data = await readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const type = contentTypes[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    res.end(data);
  } catch (error) {
    res.statusCode = 500;
    res.end('Server error');
  }
});

test.beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address() as AddressInfo | null;
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine static server port');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
});

const routes = ['/', '/apps', '/apps/plugin-manager', '/apps/metasploit'];

test('static export renders offline demo routes', async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`);
    expect(response?.status(), `${route} should respond with 200`).toBe(200);
    await expect(page.locator('#__next')).toBeVisible();
  }

  await page.goto(`${baseUrl}/apps/plugin-manager`);
  await expect(page.getByRole('heading', { name: 'Plugin Catalog' })).toBeVisible();
  const installButton = page.getByRole('button', { name: 'Install' });
  await expect(installButton).toBeVisible();
  await installButton.click();
  await expect(page.getByRole('button', { name: 'Installed' })).toBeVisible();
  const runButton = page.getByRole('button', { name: 'Run' });
  await expect(runButton).toBeVisible();
  await runButton.click();
  await expect(page.locator('pre')).toContainText('content');
});
