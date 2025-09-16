# Theme guide

The desktop shell relies on design tokens defined in `styles/tokens.css`. These CSS custom properties keep the Ubuntu/Kali skin consistent across apps and surfaces.

## Shadow elevation tokens

Use the `--shadow-elevation-*` tokens to express depth. They adapt to the active theme palette and automatically switch to high-contrast outlines when the accessibility mode is enabled.

| Token | Typical use | Notes |
| --- | --- | --- |
| `--shadow-elevation-1` | Small chips, hover previews, menus | Subtle lift for low emphasis UI. |
| `--shadow-elevation-2` | Sticky notes, dropdowns, toast notifications | Two-layer shadow for floating surfaces. |
| `--shadow-elevation-3` | Dialogs, feature cards, draggable elements | Deeper lift used for primary overlays. |
| `--shadow-elevation-4` | Desktop windows, modals with chrome | Heaviest elevation. Includes a spread for window chrome. |

### Applying shadows in CSS

```css
.card {
  box-shadow: var(--shadow-elevation-2);
}
```

To keep usage consistent in JSX/TSX, prefer the global helper classes declared in `styles/index.css`:

- `.elevation-1`
- `.elevation-2`
- `.elevation-3`
- `.elevation-4`

```jsx
<div className="rounded-md elevation-3">…</div>
```

The helper classes read from the same tokens, so custom themes or high-contrast overrides only need to change the token values.

### Accessibility behaviour

The high-contrast theme and the `prefers-contrast: more` media query swap the soft shadows for solid outlines. Components keep their elevation semantics without relying on blurred shadows, improving focus and legibility for assistive setups.
