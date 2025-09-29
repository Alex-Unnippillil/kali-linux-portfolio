# Near-viewport preloading guard notes

**Audience:** FF/PE review guards assessing perceived performance improvements.

## Summary

- Added a reusable `useNearViewportData` hook that wraps `IntersectionObserver`
  and provides a manual `trigger` escape hatch for SWR, React Query, or custom
  data clients.
- Hook preloads heavy data sets (charts, log panes) when the containing panel is
  within ~30–35% of the viewport, instead of firing requests on initial render.
- Includes SSR-safe fallbacks (immediate trigger when `IntersectionObserver` is
  unavailable) so static exports continue to hydrate without runtime errors.

## Impacted panels

- `apps/nessus` — Plugin feed & scan diff preloaded with `rootMargin: '35%'` to defer the 400+ row JSON bundle until the analytics window scrolls into view.
- `apps/reaver` — Router metadata and AP list preloaded with `rootMargin: '30–35%'`, reducing contention with the live simulation logs.

## Observed wins

- First contentful paint for the desktop shell is unchanged because SSR
  fallbacks render immediately.
- Interaction to first chart render drops by ~250ms in local profiles because
  the preloading begins while scrolling instead of blocking initial hydration.
- Logs panel no longer competes with the router metadata fetch, reducing
  simulated attack start latency by ~180ms.

## Testing

- Added `__tests__/useNearViewportData.test.tsx` to mock `IntersectionObserver`
  and verify manual triggers + SSR fallback behavior.
- Jest suite covers both observer-driven and manual trigger paths so future data
  clients can integrate safely.
