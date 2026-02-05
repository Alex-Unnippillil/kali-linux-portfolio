# Terminal QA checklist

## Plan (implementation outline)
1. Wire the pipeline worker via a worker runner with safe fallback and deterministic simulated output.
2. Stabilize terminal UX (resize observer, autocomplete buffer restore, prompt consistency).
3. Add output capture + imperative API for tests and future features.
4. Improve UX polish (settings popover, search, mobile input, clipboard feedback).
5. Persist preferences/history/aliases in OPFS with localStorage fallback.

## Verification checklist
- [ ] Keyboard shortcuts (Ctrl/Cmd+Shift+C, Ctrl/Cmd+Shift+V, Ctrl/Cmd+F) verified.
- [ ] Copy/paste works with and without selection.
- [ ] Safe Mode toggle updates prompt state and simulated output.
- [ ] Search finds matches in scrollback.
- [ ] Mobile input bar submits commands.
- [ ] Preferences persist after refresh (safe mode, font size, scrollback).
- [ ] History and aliases persist after refresh.
