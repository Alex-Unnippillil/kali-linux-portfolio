# Visual Language Guidelines

These guidelines define how vector icons are drawn for the Kali Linux Portfolio. Follow them for any new glyphs added to `components/icons/` or raster exports placed in `public/icons/`.

## Grid and Artboard

- **Base grid:** 32 × 32 unit artboard. Treat each unit as 1 px at 100% scale.
- **Alignment:** Snap every corner, control point, and gradient stop to the **2 px grid** (even-numbered coordinates). This keeps icons crisp at small sizes and avoids blurry edges after export.
- **Safe area:** Keep all strokes and fills inside a 28 × 28 safe zone (2 px inset on each side). Background frames may extend to `x = 2`/`y = 2` with `width = 28`/`height = 28`.

## Stroke, Corners, and Fills

- **Stroke weight:** Use `2 px` vector strokes. Rounded line caps and joins (`round` cap + `round` join) maintain clarity when icons scale down to 16 px.
- **Corner radius:** Rounded rectangles should use radii in 2 px increments (e.g., 4 px or 6 px) to stay on grid.
- **Boolean shapes:** Prefer boolean geometry instead of overlapping transparent fills. It prevents rendering artifacts at small sizes.

## Palette

Use the reduced Tailwind-derived palette for consistency. Backgrounds normally stay muted while strokes highlight the action color.

| Token | Hex | Use |
| --- | --- | --- |
| Midnight | `#0F172A` | Dark canvases / neutral frames |
| Slate | `#1F2937` | Alternate neutral frames |
| Electric | `#38BDF8` | Primary stroke/accent |
| Mint | `#10B981` | Success state accent |
| Amber | `#F59E0B` | Warnings / highlights |
| Magenta | `#EC4899` | Secondary accent |
| White | `#FFFFFF` | High-contrast fills |

You can mix tints and add subtle overlays (<10% opacity) if the 2 px grid is respected.

## Exporting Sizes

Icons must be available at **16, 20, 24, and 32 px**. When using React components, renderers scale the shared 32 px artboard to these sizes. If you export SVG/PNG assets for `public/icons/`, export from the 32 px master artboard at the four target dimensions and keep filenames consistent (e.g., `qr-16.svg`, `qr-20.svg`, ...).

## Accessibility and Usage

- Provide a descriptive `title` attribute or off-screen label when the icon conveys meaning.
- Use the shared `<Icon />` component to guarantee correct sizing, accessible labelling, and palette alignment.
- When combining icons with text, maintain at least 4 px spacing between the glyph and label.

By following this system, new artwork remains sharp, readable, and stylistically aligned with the portfolio UI.
