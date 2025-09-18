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

## Kali button token

Use the global `kali-button` utility for actions that should match Kali's flat control style. It ships with inset highlights,
rounded corners, and a focus ring derived from the accent color.

```jsx
<button className="kali-button">Launch</button>
```

You can override its CSS custom properties for contextual variants:

```jsx
<button
  className="kali-button"
  style={{
    '--kali-button-bg': 'rgba(10,16,23,0.8)',
    '--kali-button-border': 'rgba(255,255,255,0.25)',
    '--kali-button-shadow-outer': 'none',
  }}
>
  Overlay action
</button>
```
