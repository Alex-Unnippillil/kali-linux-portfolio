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

## Startup Timeline Devtool

For instrumentation work you can enable the startup timeline overlay:

1. Append `?devtools=1` to the portfolio URL to register the developer windows.
2. Open the **Applications** menu and launch **Startup Timeline**.
3. Use **Refresh** to snapshot the latest marks, **Export CSV** to download the data, and inspect
   `window.__STARTUP_TIMELINE__` in the console for programmatic access.

The view surfaces the `boot:*` and `desktop-ready` markers so you can track how long the shell takes to
initialize.
