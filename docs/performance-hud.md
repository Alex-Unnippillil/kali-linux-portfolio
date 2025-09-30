# Performance HUD

The Performance HUD provides QA teams with real-time visibility into hydration timing and core Web Vitals while reviewing the desktop experience.

## Enabling the HUD

1. Run the site locally (`yarn dev`) or open any deployed environment.
2. Append the `?perf` query string parameter to the URL. For example:
   ```text
   https://localhost:3000/?perf
   ```
3. To disable the overlay, remove the parameter or set it to a falsy value such as `?perf=0`.

> The flag works on any route. Client-side navigations keep the HUD enabled until the parameter is removed.

## What the overlay shows

The overlay is divided into two sections:

- **Hydration timeline** – Captures React lifecycle markers from the initial render through idle time:
  - `render start`: when React begins rendering the client bundle.
  - `layout effect`: the first layout effect pass, marking when DOM mutations are committed.
  - `hydrated`: the first standard effect, signalling that the page is interactive.
  - `after animation frame`: the next animation frame, approximating first visual update after hydration.
  - `idle`: (if supported) a `requestIdleCallback` timestamp that shows when the browser becomes idle again.
- **Latest web vitals** – Live metrics reported by the [`web-vitals`](https://github.com/GoogleChrome/web-vitals) package. Values are color coded: green for "good", amber for "needs improvement", and red for "poor".

Metrics update as the browser collects new samples. If a metric improves or regresses during a session, the delta appears below the value.

## Troubleshooting

- **No values appear** – Verify that analytics blockers are disabled. The HUD relies on the standard Web Vitals API and requires the page to remain in the foreground.
- **Hydration markers missing** – Some older browsers do not expose `requestIdleCallback`. You will still see the other lifecycle markers.
- **Need to share results** – Take a screenshot after metrics stabilize, or open the browser DevTools Performance tab for deeper traces.

For regressions, capture the HUD output and attach it to QA reports alongside reproduction steps.
