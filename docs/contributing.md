# Contributing Guide

This project powers a simulated Kali Linux desktop. When shipping updates, aim for small, tested changes that keep the demo fast and accessible.

## UI and Interaction Guidelines

- Prefer composable hooks for cross-app behavior. The `hooks/` directory contains shared utilities for input latency, persistence, and accessibility.
- Always debounce expensive filters or searches with the shared `useStableInput` hook. It provides a 150 ms trailing debounce (optional leading edge) to keep data-heavy lists responsive and ensures consistent behavior across apps. When you introduce a new search box, wire it through this hook before landing the change.
- Memoize derived state with `useMemo` or selector helpers when filtering large collections to avoid re-renders.

## Testing Expectations

- Co-locate unit tests under `__tests__/` and mirror the feature name. New hooks should include coverage for control flows (e.g., debounce timing, cleanup, and controlled usage).
- Run `yarn lint` and `yarn test` before opening a PR. CI runs the same commands.

## Accessibility

- Maintain accessible names for inputs, toggles, and interactive elements.
- Keep keyboard navigation working for the desktop shell and app windows. Test tab order and shortcuts when you change focus behavior.

## Performance

- Avoid synchronous loops on the main thread. Batch DOM updates and prefer `requestAnimationFrame` for canvas work.
- Profile new data visualizations with React DevTools or the built-in performance overlay before shipping.

## Process

1. Create a descriptive branch name (e.g., `feature/use-stable-input`).
2. Make focused commits with clear messages.
3. Update docs and changelog when behavior shifts.
4. Fill in the PR template with tests and relevant screenshots for UI changes.
