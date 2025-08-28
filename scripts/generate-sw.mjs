import { generateSW } from 'workbox-build';

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
    console.log(`Generated ${count} files, totaling ${size} bytes.`);
  } catch (err) {
    console.error('Service worker generation failed:', err);
    process.exit(1);
  }
}

buildServiceWorker();
