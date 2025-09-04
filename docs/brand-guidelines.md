# Brand Guidelines

Centralized instructions for applying project branding.

## Color Tokens

Use the following CSS variables defined in `styles/tokens.css` for consistent theming:

| Token | Variable | Example |
| --- | --- | --- |
| `ub-grey` | `--color-ub-grey` | `#0f1317` |
| `ub-orange` | `--color-ub-orange` | `#1793d1` |
| `ubt-blue` | `--color-ubt-blue` | `#62A0EA` |
| `ubt-green` | `--color-ubt-green` | `#73D216` |

## Typography

The primary typeface is Ubuntu:

```html
<p class="font-ubuntu text-ub-grey">Sample text</p>
```

## Icon Usage

Reference icons with the `img` element and Tailwind sizing utilities:

```html
<img src="/brand/logo-v1.svg" alt="Project logo" class="w-8 h-8" />
```

## Do & Don't

![Do: use the supplied logo without changes](../public/brand/logo-v1.svg)

![Don't: recolor or distort the logo](../public/brand/logo-dont.svg)

## Downloadable Assets

All brand assets live in `/public/brand`. Versioning metadata is provided in `assets.json`:

```json
{
  "version": "1.0.0",
  "assets": [
    { "name": "logo", "file": "logo-v1.svg", "version": "1.0.0" },
    { "name": "logo-misuse-example", "file": "logo-dont.svg", "version": "1.0.0" }
  ]
}
```

Use this single location to keep branding consistent across projects.
