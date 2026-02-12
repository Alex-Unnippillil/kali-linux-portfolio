# Testing workflows

## Nikto desktop Playwright coverage

This scenario automates the desktop-style interface to validate the Nikto simulation app, file exports, and global shortcuts.

### Prerequisites

1. Install dependencies and start the development server:
   ```bash
   yarn install
   yarn dev
   ```
2. In a separate terminal, run the Playwright spec:
   ```bash
   npx playwright test playwright/nikto.spec.ts
   ```
   The config expects the app to be available at `http://localhost:3000` (or `BASE_URL`).

### What the spec exercises

- Boots into the faux desktop, captures baseline desktop/body styles, and records console errors.
- Opens the **Show Applications** grid, launches the Nikto window, and waits for demo findings to load.
- Iterates through two demo targets by filling the host/port/SSL fields, verifying the command preview, and exporting the HTML report (download stream is inspected for table markup).
- For each target, opens the global keyboard shortcut overlay via the `?` shortcut, downloads the shortcuts JSON export, and dismisses the overlay.
- Opens finding detail panels, confirms contextual data, and closes them before continuing.
- Closes the Nikto app with the window controls, then asserts the desktop/body class lists, inline styles, and computed colors match the baseline snapshot to catch style leakage.
- Performs one last keyboard shortcut export after the app closes and finally asserts no console errors occurred.

### Tips

- Playwright stores downloads in a temporary location; they are not committed to the repo.
- If the overlay fails to open, ensure focus is not inside a text input when running the shortcut.
- The test assumes no third-party analytics errors surface in the console. Investigate and stub noisy endpoints before re-running if needed.
