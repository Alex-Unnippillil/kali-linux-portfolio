# Icon guidelines

This project now centralizes reusable SVG glyphs under [`components/icons`](../components/icons).
The goal is to keep small UI icons crisp on both standard and high-density displays while
sharing a consistent stroke style.

## Standard sizes

All icons are authored on a 24×24 viewBox and exposed through React components that accept a
`size` prop limited to **16**, **20**, or **24** pixels.

- **16 px** — compact UI like window controls or status pills.
- **20 px** — default size for buttons and navigation.
- **24 px** — large touch targets or spotlight tiles.

Requests outside of these values are normalized to the 24 px grid to avoid blurry scaling.
The exported `ICON_SIZES` constant lists the supported dimensions for design and QA checklists.

## Implementation details

- Use the `IconBase` helper to inherit the 24×24 viewBox, stroke styles, and accessibility
  defaults.
- Keep strokes at `1.5` units and align path coordinates to the grid. Combine with
  `vectorEffect="non-scaling-stroke"` so thickness stays predictable on 1× and 2× DPR displays.
- Favor `strokeLinecap="round"` and `strokeLinejoin="round"` for a consistent look with the rest
  of the UI.
- Include a `title` attribute when the icon needs to be announced by assistive tech; otherwise it
  renders as decorative art.

Example component pattern:

```tsx
import { forwardRef } from 'react';
import { IconBase } from '../components/icons';
import type { IconProps } from '../components/icons';

export const ExampleIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <path d="M6 12h12" vectorEffect="non-scaling-stroke" />
    <path d="M12 6v12" vectorEffect="non-scaling-stroke" />
  </IconBase>
));
```

## Usage

Icons can be imported from `components/icons` or from wrappers such as `components/ToolbarIcons`
when a default size is needed:

```tsx
import { CloseIcon, ICON_SIZES } from '../components/icons';

export function ToolbarButton() {
  return (
    <button type="button" aria-label="Close window">
      <CloseIcon size={ICON_SIZES[0]} />
    </button>
  );
}
```

Refer to `components/util-components/status.js` and `components/screen/navbar.js` for inline usage
examples that swap icons based on runtime state.
