# Test Log

## pages/apps routes console error check

Attempted to load each route under `/apps` in Chromium, Firefox, and WebKit. All requests returned HTTP 500 responses, so console errors could not be verified.

| Route | Chromium | Firefox | WebKit |
|-------|----------|---------|--------|
| /apps/2048 | HTTP 500 | HTTP 500 | HTTP 500 |
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

## WASM build matrix (2025-09-26)

- **Node 22.20.0:** `yarn build` hung during the static generation phase and required manual termination after emitting the initial PWA compilation output.【8cfa87†L1-L14】【22fe03†L1-L2】
- **Node 22.20.0:** `npx vercel build` could not run because the CLI prompts for linked project settings and exits when none are supplied in this offline environment.【e111b0†L1-L8】
- **Node 22.20.0:** Capstone WASM smoke test (`node -e ...`) succeeds, showing WebAssembly instructions decode correctly.【d45db3†L1-L12】
- **Node 20.19.5:** `yarn build` completes with full static output summaries, confirming production builds work on this release line.【341583†L1-L20】
- **Node 20.19.5:** `npx vercel build` encounters the same missing-project prompt, so preview builds cannot be exercised locally without credentials.【10fef6†L1-L2】
- **Node 20.19.5:** Capstone WASM smoke test passes, matching the successful output observed on Node 22.【06a5e9†L1-L12】
