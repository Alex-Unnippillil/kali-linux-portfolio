# Firefox Waterfall teaching guide

The Firefox app now ships with an interactive **Network Waterfall Explorer**. It simulates DNS resolution, TCP connection setup,
server processing (TTFB), and content download phases so you can teach how browser requests consume time.

This guide explains how to tailor the demo for specific lessons.

## Adjusting scenario depth

The component exposes three presets that you can tweak inside
`components/apps/firefox/Waterfall.tsx`:

```ts
const DETAIL_PRESETS = {
  overview: { count: 6, jitter: 0.25, baseGap: 42 },
  standard: { count: 11, jitter: 0.35, baseGap: 34 },
  'deep-dive': { count: 18, jitter: 0.45, baseGap: 28 },
};
```

* **count** controls the number of simulated requests.
* **jitter** controls the range of randomness applied to each phase, useful for
  comparing consistent versus volatile networks.
* **baseGap** adjusts the spacing between requests to represent bursty or
  serialized loading.

Increase the numbers for a denser exercise or dial them down for a quick
walkthrough.

## Highlighting specific assets

The request labels draw from the `RESOURCE_NAMES` array. Swap entries here to
match the application or lesson you are running. Common patterns are:

* API-heavy workloads (`GET /api/*`, WebSockets, etc.).
* Media-first experiences (images, video, progressive downloads).
* Security tooling telemetry (`/metrics`, `/audit/logs`).

Labels automatically flow through the canvas rendering, tooltips, and screen
reader table.

## Explaining protocol phases

Each phase definition includes a color, label, and description:

```ts
const PHASE_META = {
  dns: { label: 'DNS lookup', color: '#60a5fa', description: '...' },
  connect: { ... },
  ttfb: { ... },
  transfer: { ... },
};
```

Update `description` strings to align with your curriculum or translate the
copy for regional classes. Color choices should maintain at least a 3:1
contrast ratio against the background.

## Showing latency trade-offs

Educators can steer discussions by adjusting the random number generator seed.
Pass a custom seed into `generateRequests` to produce deterministic scenarios:

```tsx
const requests = useMemo(() => generateRequests(detail, 42), [detail]);
```

Using different seeds lets you contrast well-tuned CDNs versus under-provisioned
servers while keeping all other settings identical.

## Accessibility checkpoints

* The waterfall is keyboard accessible via the detail level selector.
* Screen readers receive a full data table summarizing every request.
* Tooltips respect the reduced motion preference—no inertial animation is used.

Keep these guarantees intact when customizing; the Firefox tests enforce core
interactions to prevent regressions.
