# Terminal Simulation (Kali Portfolio)

## Purpose

The Terminal app provides a Kali-style, **simulated** shell experience within the desktop portfolio. It is designed to feel authentic (prompt styling, command history, file navigation, and man pages) while remaining safe, deterministic, and offline.

### Non-goals / Safety boundaries

- **No real offensive tooling.** Commands are simulations only and must never execute real scans, exploits, or brute force actions.
- **No uncontrolled network traffic.** Network-looking commands (e.g., `nmap`, `curl`, `ping`) are blocked by default in Safe Mode and must remain simulated only.
- **No privileged filesystem access.** Data is stored in the browser via OPFS or localStorage; no host filesystem access is permitted.

## How it works

### State & persistence

- **Preferences** (safe mode, font size, scrollback, screen reader mode) are stored via `useTerminalPreferences` and persisted to OPFS when available or localStorage as a fallback.
- **Command history, aliases, and scripts** are persisted alongside preferences and hydrated on load.
- **Session transcript** is cached in memory for the current session and can be restored when session persistence is enabled.
- **Virtual filesystem** is provided by `VirtualFileSystem` (OPFS-backed) with a `FauxFileSystem` fallback when OPFS is unavailable.

### Key modules

- `apps/terminal/index.tsx` — main terminal app, wiring the xterm instance, preferences, transcript capture, and session persistence.
- `apps/terminal/utils/sessionManager.ts` — command parsing, history navigation, autocomplete, and safe-mode enforcement.
- `apps/terminal/commands/*` — command registry and implementations (including safe-mode bypass flags for safe, deterministic commands).
- `apps/terminal/utils/workerRunner.ts` — runs piped commands in a Web Worker when available; falls back to synchronous parsing when workers are not available.
- `apps/terminal/utils/filesystem.ts` — virtual filesystem abstractions used by Terminal (and shared with other simulated apps).

### Data flow

1. **User input** is captured by the xterm instance in `TerminalContainer`.
2. **Session manager** parses input, applies aliases/history, and checks Safe Mode rules.
3. **Command dispatch** happens via the command registry or the pipeline worker runner for pipe-heavy commands.
4. **Output** is written to the xterm instance and recorded in the output buffer/transcript for search/export.
5. **State persistence** updates prefs/history/aliases in OPFS or localStorage.

## Configuration & feature flags

- **Safe Mode (default: on):** Blocks network-looking commands unless explicitly marked as safe-mode bypass in the command registry. Toggled in the terminal settings panel and persisted across sessions.
- **OPFS availability:** When OPFS is unsupported, Terminal falls back to localStorage for preferences/history and to a `FauxFileSystem` root.
- **No environment flags** currently gate Terminal behavior; it is entirely client-side.

## Testing instructions

### Unit/Integration (Jest)

- Run all tests: `yarn test`.
- Targeted Terminal coverage:
  - `__tests__/terminal.test.tsx`
  - `__tests__/terminal.sessionManager.test.ts`
  - `__tests__/terminal.man.test.ts`

### E2E (Playwright, if configured locally)

- `npx playwright test`
- Manual smoke: open the Terminal app, run `help`, `ls`, and a blocked command like `nmap` with Safe Mode enabled to confirm safety guardrails.

## Common failure modes & troubleshooting

- **Safe Mode blocking commands**: Ensure the toggle is off for simulated network commands or update the command definition with `safeModeBypass` only if it is deterministic and safe.
- **OPFS unavailable**: The terminal will fall back to localStorage and the `FauxFileSystem`. If persistence appears broken, check browser storage permissions and private browsing restrictions.
- **Worker pipeline failures**: If the pipeline worker fails to load, the system falls back to synchronous parsing. Watch for console errors and confirm `workers/pipelineWorker.ts` is bundled.
- **Missing man pages**: `man` reads from `apps/terminal/man`; ensure new entries ship with a matching file name and are referenced by the command registry.
- **Static export quirks**: Terminal should remain fully functional because it is client-only. If it fails, confirm dynamic imports and worker URLs resolve correctly in static builds.
