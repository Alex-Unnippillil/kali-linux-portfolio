# Icon preload audit — October 2024

## Summary
- Added hashed variants of immediate-use icons in `public/images/logos` to stabilize caching and preload hints.
- Updated `_document.jsx` to advertise the hashed icons via `<link rel="preload">` and set the SVG favicon as the primary icon.
- Refreshed SEO metadata and the web manifest so all references point to the new hashed assets.

## Paint timing spot check
Executed a quick warm-start sample using Playwright against the dev server after the first compile settled.

```
node - <<'NODE'
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const firstPaint = await page.evaluate(() =>
    performance.getEntriesByType('paint').map((entry) => ({
      name: entry.name,
      startTime: Math.round(entry.startTime),
    }))
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const secondPaint = await page.evaluate(() =>
    performance.getEntriesByType('paint').map((entry) => ({
      name: entry.name,
      startTime: Math.round(entry.startTime),
    }))
  );
  console.log(JSON.stringify({ firstPaint, secondPaint }, null, 2));
  await browser.close();
})();
NODE
```

Key readings:
- First navigation (includes initial compilation) — FCP ≈ 37 s.
- Warm reload — FCP ≈ 2.8 s.

The preload hints ensure the bitmoji avatar and brand icons arrive in parallel with HTML parsing, which keeps the warmed path responsive.
