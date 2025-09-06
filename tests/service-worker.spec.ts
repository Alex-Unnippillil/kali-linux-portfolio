import { test, expect } from '@playwright/test';
import path from 'path';

// Ensure the service worker served at /service-worker.js includes
// precache manifest entries and hashed asset references.
test('service worker exposes manifest entries', async ({ page }) => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js');

  // Intercept the request for /service-worker.js and fulfill with the built SW.
  await page.route('**/service-worker.js', (route) => {
    route.fulfill({ path: swPath, contentType: 'application/javascript' });
  });

  const response = await page.goto('/service-worker.js');
  expect(response?.status()).toBe(200);
  const text = await response!.text();

  // Known manifest entry
  expect(text).toContain('/manifest.webmanifest');
  // Known hashed asset reference
  expect(text).toMatch(/_next\/static\/chunks\/\d+\.[a-f0-9]{16}/);
});
