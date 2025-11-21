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

## USB safety checks

The peripherals dashboard reuses the layout helpers above to keep device rows readable on small windows. Follow these guardrails when extending it:

- Show vendor/product IDs, driver names, and connection metadata on the first row so testers can capture the state quickly.
- Keep busy handle callouts in a single column with badges (`bg-*` utility + `rounded-full`) to indicate whether they can be closed automatically.
- Provide a "Layout guide" or similar link for each device so operators can jump to the safe-eject troubleshooting steps when the auto-resolution flow cannot clear every handle.
