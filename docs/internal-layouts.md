# Internal Layouts

This project provides Tailwind utilities that mimic Bootstrap's 12-column grid. Use them to create internal layouts without relying on Bootstrap itself.

## Usage

Wrap columns in a flex container and apply the `col-*` classes to control widths.

```html
<div class="flex flex-wrap">
  <div class="col-6">Left</div>
  <div class="col-6">Right</div>
</div>
```

Offsets are also available through `offset-*` classes.

```html
<div class="flex flex-wrap">
  <div class="col-4 offset-4">Centered</div>
</div>
```

## App grid container query fallback

The desktop launcher grid (`components/apps/Grid.tsx`) now relies on CSS container
queries so each window can size its tiles relative to its own width. We detect
support in two places:

- CSS uses `@supports (container-type: inline-size)` to keep the container-based
  layout when available and swap to breakpoint-driven rules when the feature is
  missing.
- JavaScript calls `CSS.supports('container-type: inline-size')` (with a few
  additional heuristics) and annotates the DOM with
  `data-container-queries="supported|fallback"`. That flag lets tests and debug
  tooling confirm which path is active and exposes a `disableContainerQueries`
  escape hatch for forcing the fallback.

When queries are unavailable (older Safari/WebKit builds, Chromium before v105),
we fall back to the viewport breakpoints defined alongside the primary styles in
`Grid.module.css`. This preserves the previous behavior while keeping all layout
rules colocated with the component.

### Limitations

- The fallback grid is viewport-based, so it will not respond to arbitrarily
  narrow window resizes until the next breakpoint is crossed.
- JavaScript detection runs after hydration. Browsers without JS still benefit
  from the CSS `@supports` path, but there can be a brief flash of the container
  layout before the fallback rules apply.
- Very old engines without `CSS.supports` skip the JS hint and rely entirely on
  the CSS branch, which mirrors Safari 15 and earlier behavior that we test via
  mocks.
