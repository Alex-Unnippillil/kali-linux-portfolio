# Performance audit notes

## Heavy list surfaces

- **App launcher grid** – already uses `react-window` with `AutoSizer` to render tiles efficiently. No changes required beyond monitoring column calculations for regressions.
- **dsniff log viewer** – previously rendered every parsed log entry inside a static `<table>`, which caused heavy DOM work when large fixtures were loaded. The new virtualized scroller keeps only the visible slice in the DOM while preserving keyboard focus management and the live region semantics.

## Follow-up ideas

- Apply the same `useVirtualList` hook to other packet/log viewers (e.g., Ettercap) if datasets expand.
- Consider sharing accessibility helpers for virtualized "grid" style logs so future tools can reuse the pattern.
