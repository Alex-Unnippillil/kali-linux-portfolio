# Marketing scroll tracker playbook

## Overview

The `utils/scroll-tracker.ts` utility instruments marketing landmarks (hero banner,
primary/secondary CTAs, etc.) using `IntersectionObserver`. When the API is
unavailable, it falls back to scroll/resize listeners with requestAnimationFrame
throttling so metrics continue working in older Safari and embedded webviews.
Events are debounced before dispatching through the shared analytics wrapper,
keeping GA4 payloads consistent with the rest of the site.

## Default coverage

Out of the box we watch these identifiers:

| Section | Selector | Event payload |
| --- | --- | --- |
| Hero | `[data-scroll-section="hero"]` | `{ category: 'Marketing', action: 'section_visible', label: 'hero' }` on enter |
| Primary CTA | `[data-scroll-section="cta-primary"]` | `{ category: 'Marketing', action: 'cta_visible', label: 'primary' }` on enter |
| Secondary CTA | `[data-scroll-section="cta-secondary"]` | `{ category: 'Marketing', action: 'cta_visible', label: 'secondary' }` on enter |

Each section also emits a matching `*_hidden` action when it leaves the viewport
so you can measure dwell time in dashboards.

## Configuring sections without code changes

Marketers can opt into tracking by applying data attributes to any element on the
landing page. The tracker will auto-discover these nodes on load and on refresh
calls.

Required attribute:

```html
<section data-scroll-section="hero"> ... </section>
```

Optional attributes:

| Attribute | Purpose |
| --- | --- |
| `data-scroll-category` | Analytics category (defaults to `Marketing`). |
| `data-scroll-action` | Action used when the element enters view (`section_visible` by default). |
| `data-scroll-exit-action` | Action used when the element leaves view (`section_hidden` by default). |
| `data-scroll-label` | Overrides the analytics label (defaults to the section id). |
| `data-scroll-threshold` | Fraction (0–1) of the element that must be visible before an enter event fires (default `0.5`). |
| `data-scroll-track` | `enter`, `exit`, or `both` to control which transitions are logged (default `enter`). |
| `data-scroll-once` | Set to `false` to allow repeated impressions; omit to keep the one-time behaviour per state. |
| `data-scroll-value` | Optional numeric GA4 value attached to enter events. |
| `data-scroll-exit-value` | Optional numeric GA4 value for exit events. |

For more advanced control you can provide a runtime configuration before the
app boots:

```html
<script>
  window.__KALI_MARKETING__ = {
    scrollTrackerSections: [
      {
        id: 'pricing-cta',
        selector: '#pricing .cta',
        trackOn: 'both',
        threshold: 0.4,
        analytics: {
          enter: { category: 'Marketing', action: 'cta_visible', label: 'pricing' },
          exit: { category: 'Marketing', action: 'cta_hidden', label: 'pricing' },
        },
      },
    ],
  };
</script>
```

Sections defined this way override the defaults, so you can ship quick experiments
without a code deployment.

## Opt-out handling

The tracker checks multiple signals before emitting any analytics event:

1. `NEXT_PUBLIC_ENABLE_ANALYTICS` must be truthy.
2. `window.__KALI_MARKETING__?.analyticsOptOut` must not be `true`.
3. `localStorage.getItem('marketing:analytics-opt-out') !== 'true'`.

Marketing teams can wire the opt-out key into cookie banners or settings panes to
respect user choices across sessions. When any of these checks fails, events are
collected for debugging (via the optional `onEvent` callback) but **not** sent to
GA4.

## Manual test checklist

1. Open the marketing landing page in Chrome or Edge, scroll until the hero and
   CTAs become visible, and confirm GA4 hits with the expected labels.
2. Repeat in Firefox (desktop) to confirm IntersectionObserver thresholds behave
   consistently.
3. Toggle the opt-out flag via `localStorage.setItem('marketing:analytics-opt-out', 'true')`
   and verify that no additional GA4 events fire.
4. Temporarily disable IntersectionObserver in DevTools (or test in an older
   Safari/webview) to confirm the fallback scroll listener still emits a single
   enter event per section.

## Maintenance tips

- Use `initializeScrollTracker({ onEvent: console.log })` during campaign QA to
  inspect the internal payloads without touching GA4 dashboards.
- Call `handle.refresh(discoverSectionsFromDom())` after client-side renders that
  add new CTAs (e.g., feature flags) so the observer registers the elements.
- Keep selector IDs unique; the tracker debounces by `section.id` to avoid
  duplicate impressions when multiple nodes share the same identifier.
