# Icon design and submission guidelines

This project treats icons as first-class assets that need to feel crisp inside the Kali-inspired desktop UI. Use the following checklist whenever you design or update an icon.

## Artboard and grid

- Build icons on a **24 × 24** viewBox. Export SVGs without extraneous wrappers.
- Snap every coordinate to the **0.5px grid** so strokes render sharply on retina and standard displays.
- When you need a frame, start with the `IconCanvas` template which already provides the padded 24px grid with a 4px corner radius and a 1.5px stroke.

## Stroke and corners

- Use a **1.5px stroke width** for all line work. This value balances visual weight against the desktop UI.
- Rectangles that require rounded corners should stick to the **0, 2 or 4px radius** options. These are the values enforced by the lint script and match the project’s existing icon language.
- Keep line caps and joins rounded for organic metaphors (search, radar, shield, terminal). The templates under `components/icons/templates/` expose these defaults for you.

## Reusable templates

The `components/icons/templates/` directory contains primitives you can compose into full icons:

- `IconCanvas`: wraps your glyph in the 24px grid and optionally draws a framed background.
- `MagnifierGlyph`: magnifying glass metaphor for search or reconnaissance actions.
- `ShieldGlyph`: protection/hardening badge with an optional checkmark overlay.
- `RadarGlyph`: sweeping radar rings for detection, scan or sensing flows.
- `TerminalGlyph`: chevron prompt and cursor block to represent shells or scripting utilities.

When creating a new icon, import these helpers rather than redrawing the same geometry. This keeps visual language consistent and makes it easier for the lint script to enforce rules.

```tsx
import { IconCanvas, RadarGlyph } from "@/components/icons/templates";

export function ScanIcon() {
  return (
    <IconCanvas backgroundFill="#0f172a" frameStroke="#38bdf8" aria-hidden>
      <RadarGlyph stroke="#38bdf8" />
    </IconCanvas>
  );
}
```

## Linting workflow

Run the icon lint script before submitting a PR:

```bash
yarn lint:icons          # validates stroke width, corner radius, grid alignment
yarn lint:icons --fix    # applies safe snapping and stroke adjustments
```

The script will exit with a non-zero status when issues remain. If it can auto-fix a problem, re-run with `--fix` and review the resulting diff.

## File locations and reviews

- Store production-ready SVGs under `components/icons/` (React wrappers) or `public/icons/` (raw assets).
- Keep exploratory work or variants in separate branches; avoid committing drafts that would fail the lint script.
- Include the lint output in design reviews when proposing new metaphors so reviewers can confirm 100% compliance.
