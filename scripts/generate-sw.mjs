import fg from 'fast-glob';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

async function buildServiceWorker() {
  try {
    const patterns = ['**/*.{js,css,html,png,svg,ico,json}'];
    const files = await fg(patterns, { cwd: 'public', onlyFiles: true });

    const manifest = [];
    for (const file of files) {
      const filePath = path.join('public', file);
      const data = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
      manifest.push({ url: '/' + file.replace(/\\/g, '/'), revision: hash });
    }

    const cacheHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(manifest))
      .digest('hex')
      .slice(0, 8);
    const cacheName = `precache-${cacheHash}`;

    const sw = `const PRECACHE_MANIFEST = ${JSON.stringify(manifest)};\n` +
      `const CACHE_NAME = '${cacheName}';\n` +
      `self.addEventListener('install', event => {\n` +
      `  event.waitUntil(\n` +
      `    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_MANIFEST.map(e => e.url))).then(() => self.skipWaiting())\n` +
      `  );\n` +
      `});\n\n` +
      `self.addEventListener('activate', event => {\n` +
      `  event.waitUntil(\n` +
      `    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && k !== 'pages').map(k => caches.delete(k)))).then(() => self.clients.claim())\n` +
      `  );\n` +
      `});\n\n` +
      `self.addEventListener('fetch', event => {\n` +
      `  if (event.request.mode === 'navigate') {\n` +
      `    event.respondWith(\n` +
      `      fetch(event.request).then(response => {\n` +
      `        const copy = response.clone();\n` +
      `        caches.open('pages').then(cache => cache.put(event.request, copy));\n` +
      `        return response;\n` +
      `      }).catch(() => caches.match(event.request))\n` +
      `    );\n` +
      `    return;\n` +
      `  }\n` +
      `  event.respondWith(caches.match(event.request).then(res => res || fetch(event.request)));\n` +
      `});\n\n` +
      `importScripts('workers/service-worker.js');\n`;

    await fs.writeFile('public/sw.js', sw);
    await fs.mkdir('public/workers', { recursive: true });
    await fs.copyFile('workers/service-worker.js', 'public/workers/service-worker.js');
    console.log(`Generated ${files.length} precached files.`);
  } catch (err) {
    console.error('Service worker generation failed:', err);
    process.exit(1);
  }
}

buildServiceWorker();
