# Application Task List

This document tracks planned improvements and new features for the desktop portfolio apps.

## Release Notes (2025-02-14)
- Desktop shell: added stable window frame test IDs and focused-window context for app-level input gating.
- Pinball: refined HUD, ball saver, multiplier combo, focus-safe input handling, and touch/gamepad controls.
- Tests: strengthened pinball coverage for ball saver, multiplier activation, and focus safety.
- Verification: `yarn verify:all` (smoke step needs Playwright browsers), `yarn test -w=1` (Jest warns about open handles), `yarn build`.

## Foundation
- Add dynamic app factory at `utils/createDynamicApp.js` to unify dynamic imports and GA events.
- Replace app imports in `apps.config.js` with the factory and `createDisplay` helper.
- Register apps and games uniformly with `display*` helpers and small default window sizes.
- Ensure new utilities have Jest tests mirroring existing ones.
- Fix terminal build by importing `@xterm/xterm/css/xterm.css` and registering `FitAddon`.
- Follow `docs/new-app-checklist.md` for all new apps.

## Desktop Apps
### Firefox
- Replace legacy Chrome simulation with single iframe shell.
- Keep navigation minimal: address bar and persisted last URL.
- Export default `Firefox` and `displayFirefox` via factory.

### Calc
- Replace button-only logic with tokenizer and shunting-yard evaluator for operator precedence.
- Add keyboard support, memory registers (M+, M−, MR), and history stored in `localStorage`.
- Register with `createDynamicApp('calc','Calc')` and export `displayCalc`.

### Terminal
- Baseline session manager, command registry, paste/autocomplete, and FitAddon wiring are complete; track future enhancements as new commands are scoped.

### Visual Studio Code
- App now embeds a StackBlitz IDE via iframe instead of a local Monaco editor.

### X
- Implement read-only timeline embed with SSR disabled and light/dark toggle.

### Spotify
- Use embed player for public tracks with editable playlist JSON and mini-player mode.

### YouTube
- ✅ Debounced search results hit the YouTube API when configured and fall back to the demo catalog when offline.
- ✅ Watch view loads embeds on selection and remembers recently watched videos with a clear history action.
- ✅ Component tests cover the search filtering, watch flow, and history persistence.

## Security Tool Simulators
Implement safe, non-executing simulators for each tool. Features:
- Load sample outputs from JSON fixtures and explain them.
- Provide command builder UI that crafts strings but never runs them.
- Show "For lab use only" banner and optional "enable lab mode" flag (off by default).

Tools to cover: **BeEF, Ettercap, Metasploit, Wireshark, Kismet, Nikto, Autopsy, Nessus, Hydra, Nmap NSE, Radare2, Volatility, Hashcat, Metasploit Post, dsniff, John the Ripper, OpenVAS, Recon-ng, Ghidra, Mimikatz, Reaver**.

## Other Apps
### About Alex
- Replace static content with resume widget loaded from JSON; show skills as chips and project links.

### Settings
- Add theme picker, wallpaper selector, and "reset desktop" clearing `localStorage` in `settingsStore.js`.

### Resource Monitor
- Display `performance.memory` data and FPS from `performance.now()` deltas.
- Show CPU synthetic load graph using `requestAnimationFrame` buckets.

### Project Gallery
- Load projects from `projects.json`; add filters and buttons for repo and live demo.

### Todoist
- Implement local task manager with sections, due dates, drag-drop ordering, and quick-add shortcut.
- Persist tasks in `localStorage`.

### Trash
- Soft-delete files from virtual FS with restore or empty options; store original path metadata.

### Contact Me
- Simple form posting to dummy endpoint with client-side validation and privacy note.

### Converter
- Centralize unit mappings in `components/apps/converter/units.js` and maintain test coverage.

### QR Tool
- Add camera select drop-down and "download QR" button after generation.

### ASCII Art
- Support text-to-ASCII and image-to-ASCII via hidden canvas sampling.

### Figlet
- Provide font selector, copy-to-clipboard, and cache fonts in IndexedDB.

### Quote Generator
- Use offline JSON quotes with tags and "no repeats" option.

### Weather
- Show fake data with city picker and unit toggle, or accept user-provided API key in settings.

## Games
For each game below, build a canvas-based component with `requestAnimationFrame` game loop, `reset()` function, pause, sound toggle, small default window size, and localStorage highscores. Register each with `createDynamicApp('<name>','<Title>')` and `createDisplay`.

- 2048
- Asteroids
- Battleship
- Blackjack
- Breakout
- Car Racer
- Checkers
- Chess
- Connect Four
- Frogger
- Hangman: add found words list, timer, difficulty.
- Memory
- Minesweeper
- Pacman
- Platformer
- Pong
- Reversi
- Simon
- ~~Snake~~ – shared canvas loop, pause/reset/audio toggles, and persistent highscores shipped
- Sokoban
- Solitaire
- Tic Tac Toe
- Tetris
- Tower Defense
- Word Search: enhance with found words list, timer, difficulty.
- Nonogram
- Space Invaders
- Sudoku
- Flappy Bird
- Pinball

## Housekeeping
- Keep `apps.config.js` organized with utilities and games grouped and exported consistently.
- Monitor `fast-glob` updates and explore hash optimizations for the custom service worker.

### App Icon Refresh
- Inventory every app logo under `public/apps`, `public/assets`, and other icon folders; note sizes and current formats.
- Source high-resolution SVG replacements with permissive licenses suited for redistribution and attribution notes.
- Replace bitmap logos in the repo with the curated SVGs and update any manifest or config references that expect new filenames.
- Run a visual regression pass in the desktop shell to confirm icons render crisply at launcher, dock, and window chrome sizes.
