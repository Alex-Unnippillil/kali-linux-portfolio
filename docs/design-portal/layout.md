# Layout guidelines

Layout rules for the resource monitor ensure the new textured charts remain legible and accessible.

## Grid

- Charts sit in a responsive two-column grid (`md:grid-cols-2`). On narrow screens they stack vertically with `1.5rem` gaps.
- Each card uses `var(--kali-panel)` with `80%` opacity to preserve contrast between the textured fill and the background wallpaper.

## Texture accessibility

- Reserve distinct textures for CPU (forward diagonals), memory (dot grid), disk (cross hatch), and network (horizontal bands).
- Tooltips must reiterate the texture description ("Texture: cross-hatch pattern") so monochrome printouts and screen readers convey the same meaning.
- Keep the chart background at or below `rgba(15,23,42,0.35)` so the white ink from the texture has at least a 4.5:1 contrast ratio.

## Tooltip placement

- Pin tooltips to the top-left of each card so they do not obstruct the latest samples. The pointer-events should remain disabled while hidden to avoid trapping focus.
- Include hidden `sr-only` descriptions linking pattern semantics to the latest value. This ensures assistive tech can interpret the layout without relying on colour or motion cues.
