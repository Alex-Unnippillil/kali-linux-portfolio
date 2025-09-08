# Test Log

## pages/apps routes console error check

Attempted to load each route under `/apps` in Chromium, Firefox, and WebKit. All requests returned HTTP 500 responses, so console errors could not be verified.

| Route | Chromium | Firefox | WebKit |
|-------|----------|---------|--------|
| /apps/blackjack | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/calculator | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/checkers | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/connect-four | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/minesweeper | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/nmap-nse | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/password_generator | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/phaser_matter | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/sokoban | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/sticky_notes | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/timer_stopwatch | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/weather_widget | HTTP 500 | HTTP 500 | HTTP 500 |
| /apps/word_search | HTTP 500 | HTTP 500 | HTTP 500 |

## Serverful and Static modes (2025-02-13)

- `yarn build` failed: Module not found: Can't resolve '../../ui/FormError' in `components/apps/serial-terminal.tsx`.
- `yarn export` now uses `output: 'export'` in `next.config.js` to generate a static build.
- `yarn test` reported failing tests: `hashcat.test.tsx`, `beef.test.tsx`, `mimikatz.test.ts`.

## bare-fs warning (2025-08-29)

- `yarn why bare-fs` shows the module is required by `tar-fs@3.1.0` via `@puppeteer/browsers@2.10.7`.
- Latest versions (`@puppeteer/browsers@2.10.8`, `tar-fs@3.1.0`) still depend on `bare-fs@4.2.1`, so the warning remains.
- `puppeteer` and `puppeteer-core` require this chain; removing them would break existing tooling, so the warning is ignored.

## Accessibility contrast checks (2025-09-08)

- `text-gray-400` on light backgrounds failed WCAG AA contrast in several components (QuickSettings, Network Manager, Gigolo, Bluetooth panel).
- Updated disabled and empty-state text to use `text-gray-600 dark:text-gray-400` for sufficient contrast in both light and dark themes.

## Sticky Notes share target (2025-02-14)

- Verified the manifest `share_target` flow on Chrome and Edge.
- Sharing a text snippet in either browser opens the PWA and creates a new Sticky Note with the shared content.
