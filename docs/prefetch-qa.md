# Desktop icon prefetch QA checklist

## Summary

- Desktop app icons now schedule module and route prefetch when they enter the viewport or receive keyboard focus.
- Prefetch work is deferred with `scheduler.postTask` (when available) or `requestIdleCallback`, so requests fire only when the main thread is idle.
- Pointer-aware observer settings reduce unnecessary traffic on touch hardware by shrinking the `rootMargin` and raising the intersection threshold for coarse pointers.
- Every prefetch that runs pushes an entry into `window.__DESKTOP_PREFETCH_LOG__`, capturing the icon id, route, source trigger, and a `performance.now()` timestamp for easy verification.

## Measuring in Chrome DevTools

1. Run `yarn dev` and open the desktop at `http://localhost:3000`.
2. Open DevTools → **Console** and run `window.__DESKTOP_PREFETCH_LOG__`.
3. Wait until the array populates; each entry looks like `{ id, route, source, timestamp }`.
4. The `timestamp` value is relative to `performance.now()` and indicates how many milliseconds after navigation the idle-prefetch executed.
5. To confirm network traffic, open the **Network** panel and filter for requests whose URL contains `/_next/data` or `/_next/static/chunks/pages/apps`. These entries appear shortly after the timestamps recorded in the console log.

## Sample timing (Playwright headless Chromium)

- Earliest desktop prefetch recorded at ~3533 ms (`trash` icon).
- Subsequent icons (`about`, `firefox`, `gedit`) prefetched within ~9 ms of each other while the viewport remained idle.

The snippet below was captured with Playwright driving Chromium 140 against `yarn dev` and reading `window.__DESKTOP_PREFETCH_LOG__` after a 2 s idle window:

```
[
  { "id": "trash", "route": "/apps/trash", "source": "intersection", "timestamp": 3533.4 },
  { "id": "about", "route": "/apps/about", "source": "intersection", "timestamp": 3537.6 },
  { "id": "firefox", "route": "/apps/firefox", "source": "intersection", "timestamp": 3539.1 },
  { "id": "gedit", "route": "/apps/gedit", "source": "intersection", "timestamp": 3542.1 }
]
```

These values provide a baseline for QA; significantly earlier timestamps suggest the viewport trigger fired before idle time was available, while noticeably later timestamps may indicate the main thread was busy.

## Guardrails to verify

- **Pointer detection**: Use DevTools sensors to toggle between `fine` and `coarse` pointers. On coarse pointers, the observer waits for ~60 % visibility with a small `rootMargin`, reducing prefetch churn on touch devices.
- **Keyboard focus**: Tab to any icon; the `source` field in the console log switches to `focus`, showing the fallback path for keyboard navigation.
- **Disabled icons**: Items marked disabled (e.g., simulated folders) should not emit log entries or network requests.
