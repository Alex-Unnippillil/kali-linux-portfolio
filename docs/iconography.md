# Iconography Guidelines

This project now ships a consolidated set of reusable SVG icons in [`/public/icons`](../public/icons). All assets in the catalogue
follow the same grid and stroke rules so they blend with the Kali/Ubuntu desktop aesthetic.

## Design spec

- **Viewbox:** Every icon is drawn on a 24 × 24 viewbox and exported at 48, 64, and 128 px canvas sizes.
- **Stroke:** `stroke-width` of `1.5`, `stroke="currentColor"`, and rounded caps/joins. Icons stay outlined and inherit
  foreground color.
- **Fill:** Root `fill="none"`. Inner shapes rely on strokes only—no solid fills.
- **Output:** Commit SVGs for each required size. The `scripts/validate-icons.mjs` linter enforces naming, sizing, and stroke
  attributes during CI.

Render icons in React with the shared `Icon` component:

```tsx
import Icon from '@/components/ui/Icon';

<Icon name="shield" size={64} />;
```

## Audit checklist

The current set is tracked in [`data/icons/manifest.json`](../data/icons/manifest.json). Each entry lists keywords and the audit
status. The February 2025 refresh covered:

| Icon        | Label              | Status             |
|-------------|--------------------|--------------------|
| `audit`     | Audit Checklist    | `refreshed-2025-02`|
| `network`   | Network Graph      | `refreshed-2025-02`|
| `radar`     | Radar Sweep        | `refreshed-2025-02`|
| `report`    | Report Dashboard   | `refreshed-2025-02`|
| `shield`    | Defender Shield    | `refreshed-2025-02`|
| `terminal`  | Terminal Window    | `refreshed-2025-02`|

Add new icons to the manifest first, generate SVGs for each supported size, then run:

```bash
yarn icons:lint
```

CI calls the same script inside `scripts/verify.mjs`, so mismatched assets fail the build early.
