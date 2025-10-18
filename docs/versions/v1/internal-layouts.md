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
