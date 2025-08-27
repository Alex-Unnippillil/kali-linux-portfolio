# Application Task List

This document tracks planned improvements and new features for the desktop portfolio apps.

## Foundation
- Add dynamic app factory at `utils/createDynamicApp.js` to unify dynamic imports and GA events.
- Replace app imports in `apps.config.js` with the factory and `createDisplay` helper.
- Register apps and games uniformly with `display*` helpers and small default window sizes.
- Ensure new utilities have Jest tests mirroring existing ones.
- Fix terminal build by importing `xterm` styles and registering `FitAddon`.
- Follow `docs/new-app-checklist.md` for all new apps.

## Desktop Apps
### Google Chrome
- Convert component to pure JS.
- Implement address bar with history management and persistent bookmarks.
- Support "Open in window" and "Open in tab" modes; persist last URL per window.
- Export default `Chrome` and `displayChrome` via factory.

### Calc
- Replace button-only logic with tokenizer and shunting-yard evaluator for operator precedence.
- Add keyboard support, memory registers (M+, M−, MR), and history stored in `localStorage`.
- Register with `createDynamicApp('calc','Calc')` and export `displayCalc`.

### Terminal
- Import `xterm/css/xterm.css` and `FitAddon`; call `fitAddon.fit()` on mount and resize.
- Implement command registry (`help`, `ls`, `cat`, `clear`, `open <app>`, `about`, `date`).
- Add paste support, auto-complete, and scrollback limit.
- Keep client-only dynamic import.

### Visual Studio Code
- Convert to JS and export `displayVsCode`.
- Add "Open folder" using JSON "virtual FS" backed by `localStorage` with editor tabs and search.

### X
- Implement read-only timeline embed with SSR disabled and light/dark toggle.

### Spotify
- Use embed player for public tracks with editable playlist JSON and mini-player mode.

### YouTube
- Add search and watch view with click-to-load embeds.
- Store "recently watched" in `localStorage`.
- Add a basic component test similar to existing ones.

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
- Snake
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

