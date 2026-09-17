# Desktop and phone interaction polish

The homepage opens the Kali OS. About, Projects and Contact remain app windows.
There is no portfolio landing page, mobile microsite or replacement desktop.

## Working with applications

On a phone, the bottom **Apps** button opens the existing application launcher.
Running applications appear beside it. Tap an application to switch to it or
restore it after minimizing. The list scrolls horizontally when needed. The bar
follows the visible viewport when the software keyboard opens. The floating
closed/minimized shelves are desktop-only, so they no longer cover phone content.
Desktop windows still support their existing moving, resizing and taskbar flows.

Calculator shortcuts are scoped to the calculator, not the whole document.
Typing into Notes, Contact or a launcher cannot modify an open calculation.
Expression editing retains native selection, Backspace, modifier shortcuts and
IME composition. The touch keypad does not force open the software keyboard;
tap the expression field when direct editing is needed.

Sticky Notes now mounts and cleans up on every open/close. Add Note starts with
empty text, not a click-event object. Notes reuse the existing IndexedDB database;
per-record updates do not clear other records. Existing local-storage migration
is retained. Delete has an Undo action. Saving failures are visible instead of
claiming success. Phone notes use readable stacked cards; desktop note placement
and dragging remain. Browser-only storage is not a cloud backup.

An application download failure offers **Try again** within that window, without
reloading the desktop or discarding other unsaved work. Collapsed desktop shelves
are inert, so invisible controls cannot capture keyboard navigation.

## Verification

Use Node 24 and the committed Yarn release. Browser tests belong to the actual
operating-system UI, not a standalone landing page.

```sh
corepack enable
yarn install --immutable
yarn dedupe:check
yarn lint
yarn typecheck
yarn test --coverage --maxWorkers=2
yarn npm audit --all --recursive --severity high
yarn build
yarn export
yarn playwright install --with-deps chromium
yarn build
yarn playwright test --config=playwright.portfolio.config.ts
```

`tests/portfolio/app-polish.spec.ts` exercises calculation, typing into another
open app, note save/reopen/delete/undo, minimized phone app restoration, the
phone launcher and desktop parity. Existing tests cover eight viewport sizes,
window controls, project navigation, keyboard launcher and scoped accessibility.
These focused checks do not certify every feature in every bundled simulation.
