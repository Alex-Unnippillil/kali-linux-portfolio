# Testing

## Playwright regression coverage

### VS Code embed cleanup (`playwright/vscode.regression.spec.ts`)

* Navigates directly to `/apps/vscode` and waits for the StackBlitz VS Code embed to boot.
* Opens the `public/wallpapers/wall-7.webp` asset (≈246 KB) via Quick Open to exercise large-file rendering inside the iframe.
* Runs a workspace search for the term `"portfolio"` to ensure the search service remains responsive.
* Clicks the host window close button to remove the VS Code iframe.
* Verifies Chromium event listener counts from `getEventListeners(window)` do **not** grow once the iframe is torn down.
* Uses `requestIdleCallback` and `performance.now()` to require that the page returns to an idle state within **2 seconds** of closing.

> The spec relies on Chromium because `getEventListeners` is a Chrome DevTools protocol API. CI runs it in the `playwright-vscode` job.
