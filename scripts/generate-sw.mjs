import { generateSW } from 'workbox-build';
import fs from 'fs';

async function buildServiceWorker() {
  try {
    const { count, size } = await generateSW({
      globDirectory: 'public',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
      swDest: 'public/service-worker.js',
      skipWaiting: true,
      clientsClaim: true,
      inlineWorkboxRuntime: true,
      navigateFallback: '/offline.html',
      importScripts: ['workers/service-worker.js'],
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.destination === 'document',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
          },
        },
      ],
    });
    await fs.promises.mkdir('public/workers', { recursive: true });
    await fs.promises.copyFile('workers/service-worker.js', 'public/workers/service-worker.js');
    console.log(`Generated ${count} files, totaling ${size} bytes.`);
  } catch (err) {
    console.error('Service worker generation failed:', err);
    process.exit(1);
  }
}

buildServiceWorker();
