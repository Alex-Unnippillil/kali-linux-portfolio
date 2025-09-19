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

## Undo history hooks

- Register undoable actions with the journal so the desktop can surface them
  for <kbd>Ctrl</kbd>+<kbd>Z</kbd> inside the app window and
  <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Z</kbd> globally.
- Import helpers from `utils/journal`:

```ts
import { recordJournalEntry, clearJournal } from '../../utils/journal';

recordJournalEntry({
  appId: 'my-app',
  description: 'Added note',
  undo: () => removeNote(id),
});

// Call when the app resets state (e.g. on restart) so stale undo stacks clear
clearJournal('my-app');
```

- The window component automatically clears an app's stack on unmount, but
  explicit `clearJournal` calls keep the history accurate after internal resets.
