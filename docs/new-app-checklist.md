# New App Checklist

Use this checklist when adding a new app to the portfolio.

## Icon

- Place a **64x64** SVG or PNG icon in `public/themes/Yaru/apps/`.
- Name the file after the app id (e.g. `my-app.svg`).
- Reference the icon in `apps.config.js` with `icon: './themes/Yaru/apps/my-app.svg'`.

## Dynamic import pattern

```ts
import dynamic from 'next/dynamic';

const MyApp = dynamic(() => import('./components/apps/my-app'), {
  ssr: false,
});
export const displayMyApp = () => <MyApp />;
```

## Content Security Policy

- Apps that fetch data or embed external sites must whitelist their domains in `next.config.js`.
- Update the appropriate directives (`connect-src`, `frame-src`, `img-src`) and `images.domains` when needed.

## Playwright smoke test

```ts
import { test, expect } from '@playwright/test';

test('My App launches', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=My App');
  await expect(page.locator('[data-testid="my-app"]')).toBeVisible();
});
```

## Launcher search index

- Add any common aliases for the app to `data/search-synonyms.json`. Each key should be the alias text and the value either a
  single app id or an array of ids that should appear for that alias.
- Keep aliases in lowercase for readability; the search hook normalizes casing at runtime.
- Run `yarn test searchSynonyms` to confirm the Whisker Menu resolves the new aliases.
