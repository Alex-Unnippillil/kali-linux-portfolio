# App Ecosystem Roadmap

This roadmap consolidates the dynamic app registry and the open task backlog so the desktop shell, simulations, and games progress toward an "OS-ready" state. Update it whenever `apps.config.js` or `docs/tasks.md` changes so stakeholders can track ownership, dependencies, and status.

## Readiness Criteria for Every App

An app is considered **OS-ready** only when it satisfies these cross-cutting standards:

1. **UI polish** – responsive window layout, consistent launcher iconography, tuned default window sizes, and visual QA across light/dark wallpapers.
2. **Accessibility** – keyboard navigation, focus order, ARIA labeling, and high-contrast theming validated for both the desktop frame and the app’s internal UI.
3. **Offline behavior** – graceful fallbacks when network APIs or iframes fail, including demo data for simulators and cached assets for utilities/games.
4. **Telemetry & privacy** – analytics hooks emit structured events when `NEXT_PUBLIC_ENABLE_ANALYTICS` is enabled while remaining silent otherwise. No unexpected network calls or stored secrets.

## Roadmap by Category

Each table groups the entries declared in `apps.config.js` and captures current implementation signals, suggested owners, and notable dependencies. Status values reflect whether `docs/tasks.md` still lists open work.

### Utilities & Productivity

| App ID | Display Name | Owner | Status | Key Dependencies / Notes |
| --- | --- | --- | --- | --- |
| terminal | Terminal | Core maintainers | **Ready** – session manager, command registry, and xterm fit wiring shipped | `@xterm/xterm`, FitAddon |
| vscode | VsCode | Core maintainers | **Needs polish** – StackBlitz iframe embed flow requires validation | StackBlitz embed permissions |
| firefox | Firefox | Core maintainers | **In progress** – rebuild around iframe shell with persisted URL | Browser iframe, storage |
| x | X | Core maintainers | **Ready** – official embed script with manual theme toggle and graceful fallback | Social embed script |
| spotify | Spotify | Core maintainers | **In progress** – playlist editor JSON and mini-player mode pending | Spotify embed |
| youtube | YouTube | Core maintainers | **Beta** – debounced search, watch view, history storage, and component tests shipped; monitor API fallback | YouTube embeds, localStorage |
| calculator | Calculator | Core maintainers | **In progress** – tokenizer, shunting-yard evaluator, keyboard support | Expression parser |
| converter | Converter | Core maintainers | **In progress** – centralized unit map and Jest coverage | `components/apps/converter/units.js` |
| file-explorer | Files | Core maintainers | **In progress** – shared navigator hook keeps breadcrumbs and recents aligned | Virtual filesystem layer |
| project-gallery | Project Gallery | Core maintainers | **In progress** – load from `projects.json`, add filters and CTA buttons | `projects.json` data |
| alex | About Alex | Core maintainers | **In progress** – resume widget, skill chips, project links | Resume JSON feed |
| settings | Settings | Core maintainers | **In progress** – theme picker, wallpaper selector, reset desktop | `settingsStore.js`, localStorage |
| resource_monitor | Resource Monitor | Core maintainers | **In progress** – memory/FPS display and synthetic CPU graph | `performance` APIs |
| screen-recorder | Screen Recorder | Core maintainers | **Needs polish** – permission prompts, storage strategy | MediaRecorder API |
| clipboard-manager | Clipboard Manager | Core maintainers | **Ready** – permission UX, fallbacks, and status telemetry covered | Clipboard API |
| figlet | Figlet | Core maintainers | **In progress** – font selector, copy action, IndexedDB caching | Font assets, IndexedDB |
| weather | Weather | Core maintainers | **In progress** – city groups refresh from Open-Meteo; surface settings tie-ins for alerts | Demo data, settings |
| weather_widget | Weather Widget | Core maintainers | **Ready** – shares Open-Meteo data, respects Settings, and ships offline fallback | Settings integration |
| qr | QR Tool | Core maintainers | **In progress** – camera selector and downloadable output | MediaDevices API |
| ascii_art | ASCII Art | Core maintainers | **In progress** – text/image conversion pipeline | Canvas sampling |
| quote | Quote | Core maintainers | **In progress** – offline JSON source and no-repeat option | Local JSON |
| input-lab | Input Lab | Core maintainers | **Needs polish** – ensure device coverage (keyboard, mouse, gamepad) | Device APIs |
| subnet-calculator | Subnet Calculator | Core maintainers | **Needs polish** – validation UX and shared presets | Network calc utils |
| sticky_notes | Sticky Notes | Core maintainers | **Needs polish** – confirm persistence model and drag handles | localStorage |
| trash | Trash | Core maintainers | **In progress** – soft-delete metadata with restore/empty flows | Virtual filesystem metadata |
| serial-terminal | Serial Terminal | Core maintainers | **Needs polish** – confirm serial transport stubs | Web Serial API mock |
| plugin-manager | Plugin Manager | Core maintainers | **Needs triage** – document scope and dependencies | Plugin metadata |
| ssh | SSH Command Builder | Core maintainers | ✅ Ready – preset library, validation, and export actions shipped | Command templates |
| http | HTTP Request Builder | Core maintainers | **Needs polish** – form validation and canned responses | HTTP schema mocks |
| html-rewriter | HTML Rewriter | Core maintainers | **Needs polish** – transformation demos and worker wiring | Worker stubs |
| contact | Contact | Core maintainers | **In progress** – validation, privacy note, dummy submit endpoint | Form schema, API stub |
| gedit | Gedit | Core maintainers | **Needs polish** – ensure contact workflow alignment and EmailJS option | EmailJS config |
| todoist | Todoist | Core maintainers | **In progress** – sections, due dates, drag-drop, quick-add, persistence | localStorage, DnD |

#### Clipboard Manager QA Update (May 2024)

- Permission preflight now surfaces clear read/write status, fallback messaging, and retry guidance directly in the app UI.
- Automated coverage exercises clipboard availability, permission denial handling, and history reuse via `__tests__/ClipboardManager.test.tsx`.
- Browser compatibility focus areas:

| Browser | Minimum version | Notes |
| --- | --- | --- |
| Chrome / Edge (Chromium) | 66+ / 79+ | Full async Clipboard API support; standard permission prompts covered by the status banner. |
| Firefox | 87+ | Clipboard reads require user gesture; denied permissions trigger the in-app remediation guidance. |
| Safari | 13.1+ | Write support is stable; reads prompt per gesture and fall back to manual copy instructions when blocked. |
| Legacy / unsupported contexts | – | App surfaces "Clipboard API not supported" messaging and preserves manual copy workflows. |

### Security Tool Simulators

| App ID | Display Name | Owner | Status | Key Dependencies / Notes |
| --- | --- | --- | --- | --- |
| nikto | Nikto | Security simulations pod | **In progress** – load canned outputs and lab banner | JSON fixtures, lab mode flag |
| wireshark | Wireshark | Security simulations pod | **In progress** – simulator backlog | Packet capture fixtures |
| ble-sensor | BLE Sensor | Security simulations pod | **Needs polish** – finalize simulator UX and datasets | BLE datasets |
| dsniff | dsniff | Security simulations pod | **In progress** – command builder and sample outputs | Command templates |
| beef | BeEF | Security simulations pod | **In progress** – simulator backlog | Browser exploit fixtures |
| metasploit | Metasploit | Security simulations pod | **In progress** – simulator backlog | Module JSON |
| autopsy | Autopsy | Security simulations pod | **In progress** – simulator backlog | Forensic dataset |
| radare2 | Radare2 | Security simulations pod | **In progress** – simulator backlog | Static analysis fixtures |
| ghidra | Ghidra | Security simulations pod | **In progress** – simulator backlog | Reverse-engineering fixtures |
| hashcat | Hashcat | Security simulations pod | **In progress** – simulator backlog | Hash samples |
| msf-post | Metasploit Post | Security simulations pod | **In progress** – simulator backlog | Module JSON |
| evidence-vault | Evidence Vault | Security simulations pod | **Needs polish** – clarify evidence data model | Forensics fixtures |
| mimikatz | Mimikatz | Security simulations pod | **In progress** – simulator backlog | Credential dump fixtures |
| mimikatz/offline | Mimikatz Offline | Security simulations pod | **Ready** – offline datasets packaged with lab flows and Jest coverage | Offline dataset suite |
| ettercap | Ettercap | Security simulations pod | **In progress** – simulator backlog | Network capture fixtures |
| reaver | Reaver | Security simulations pod | **In progress** – simulator backlog | Wi-Fi fixtures |
| hydra | Hydra | Security simulations pod | **In progress** – simulator backlog | Credential list fixtures |
| john | John the Ripper | Security simulations pod | **Beta** – lab-mode fixtures, command builder, and interpretation cards landed; monitor QA feedback | Wordlist fixtures, Lab Mode |
| nessus | Nessus | Security simulations pod | **In progress** – simulator backlog | Scan report fixtures |
| nmap-nse | Nmap NSE | Security simulations pod | **In progress** – simulator backlog | Script outputs |
| openvas | OpenVAS | Security simulations pod | **In progress** – simulator backlog | Scan report fixtures |
| reconng | Recon-ng | Security simulations pod | **In progress** – simulator backlog | Recon dataset |
| kismet.jsx | Kismet | Security simulations pod | **Beta** – fixture dataset with channel/device filters behind Lab Mode | Wireless fixtures, lab mode flag |
| security-tools | Security Tools | Security simulations pod | **Needs polish** – ensure catalog UX & lab-mode flag | Tool registry |

### Games & Interactive Experiences

All arcade-style and puzzle titles share the same readiness gap: implement canvas-based loops, pause/reset, audio toggles, and localStorage high scores. Status is marked **Needs polish** unless additional gameplay tasks are noted.

| App ID | Display Name | Owner | Status | Key Dependencies / Notes |
| --- | --- | --- | --- | --- |
| tictactoe | Tic Tac Toe | Core maintainers | **Needs polish** – confirm canvas loop & OS alignment | Canvas loop, localStorage |
| chess | Chess | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| connect-four | Connect Four | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| hangman | Hangman | Core maintainers | **In progress** – add word list, timer, difficulty | Word list data |
| frogger | Frogger | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| flappy-bird | Flappy Bird | Core maintainers | **Ready** – shared game scaffolding, input remap, and ghost persistence aligned | Game engine |
| 2048 | 2048 | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| snake | Snake | Core maintainers | **Ready** – shared canvas loop, pause/reset/audio toggles, and persistent high score shipped | Game engine |
| memory | Memory | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| minesweeper | Minesweeper | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| pong | Pong | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| pacman | Pacman | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| car-racer | Car Racer | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| lane-runner | Lane Runner | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| platformer | Platformer | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| battleship | Battleship | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| checkers | Checkers | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| reversi | Reversi | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| simon | Simon | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| sokoban | Sokoban | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| solitaire/index | Solitaire | Core maintainers | **Needs polish** – align with shared game scaffolding | Enhanced TS solitaire module |
| tower-defense | Tower Defense | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| word-search | Word Search | Core maintainers | **In progress** – add timer, difficulty, found words list | Word lists, timer |
| wordle | Wordle | Core maintainers | **Needs polish** – align with shared game scaffolding | Word list |
| blackjack | Blackjack | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| breakout | Breakout | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| asteroids | Asteroids | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| sudoku | Sudoku | Core maintainers | **Needs polish** – align with shared game scaffolding | Puzzle engine |
| space-invaders | Space Invaders | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| nonogram | Nonogram | Core maintainers | **Needs polish** – align with shared game scaffolding | Puzzle engine |
| tetris | Tetris | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| candy-crush | Kali Crush | Core maintainers | **QA ready** – shared loop controls, boosters, persistent stats | Match-3 logic, audio hooks |
| gomoku | Gomoku | Core maintainers | **Needs polish** – align with shared game scaffolding | Game engine |
| pinball | Pinball | Core maintainers | **Needs polish** – align with shared game scaffolding | Physics engine |

## Outstanding Feature Work by Category

- **Utilities & Productivity** – Implement calculator engine, YouTube history, QR camera picker, ASCII/Quote offline content, Resource Monitor metrics, Weather fake data, settings reset flow, Trash soft-delete metadata, HTTP/SSH builders, and contact form validation before claiming readiness.
- **Security Tool Simulators** – For every simulator, load canned outputs, provide safe command builders, surface "For lab use only" banners, and gate advanced flows behind the lab-mode flag to remain non-destructive.
- **Games & Interactive** – Build a shared canvas framework (loop, pause/reset, audio toggles, localStorage high scores) and apply it across all titles, prioritizing flagship experiences such as Tetris, 2048, and Space Invaders.

### OS-alignment To-Dos

1. **Permission prompts** – Normalize UX for media capture, clipboard access, and simulator lab toggles. Provide pre-flight dialogs and fallbacks for denied permissions.
2. **Shared settings** – Route wallpaper, theme, analytics, API keys, and lab-mode flags through a centralized settings store that utilities and simulators can read.
3. **Window defaults** – Audit each entry in `apps.config.js` for default/min size metadata to keep windows within the desktop grid and clear of dock/taskbar collisions.

## Living Checklist for Adding or Updating Apps

Use this checklist whenever a new app lands or an existing one gains major functionality:

1. **Registry update** – Add or adjust the dynamic app registration in `apps.config.js`, keeping alphabetical grouping and default window metadata tidy.
2. **Implementation** – Follow `docs/new-app-checklist.md` for icon placement, dynamic import pattern, CSP updates, and Playwright smoke coverage.
3. **Testing** – Extend Jest and Playwright suites for new behaviors (fixture-driven tests for simulators, loop helpers for games, form validation for utilities).
4. **Documentation** – Update this roadmap and `docs/tasks.md` with status, owner, and dependency changes. Capture any new env vars in `README.md`.
5. **OS readiness review** – Verify the readiness criteria (UI polish, accessibility, offline behavior, telemetry) before surfacing the app in launchers or marketing.

> _Keep this document synchronized with the codebase. When an app ships a milestone, flip its status to **Ready**, cite the supporting PR, and prune related TODOs in `docs/tasks.md`._
