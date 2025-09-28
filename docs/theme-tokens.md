# Kali theme tokens

The Kali desktop shell centralises its palette in [`styles/themes/kali.ts`](../styles/themes/kali.ts).  
Use the exported `kaliTheme` (CSS `var()` references) and `kaliThemeVars` (raw variable names) instead of hard-coding `--kali-*` values inside components.

## Available tokens

| Token | Purpose |
| --- | --- |
| `kaliTheme.background` | Primary desktop background. |
| `kaliTheme.text` | Default foreground text colour. |
| `kaliTheme.accent` | Accent/UI highlights. |
| `kaliTheme.sidebar` | Sidebar and secondary panels. |
| `kaliTheme.panel` | Frosted glass panel surface. |
| `kaliTheme.panelBorder` | Subtle panel border/divider colour. |
| `kaliTheme.hover` | Hover highlight used for overlays and interactive states. |
| `kaliTheme.focus` | Focus ring colour for keyboard users. |
| `kaliTheme.shadow` | Drop shadow token reused across panels. |

> When you need the resolved colour (for example on a `<canvas>` context), read the raw variable name from `kaliThemeVars` and call `getComputedStyle(...).getPropertyValue(name)`.

## Usage patterns

```tsx
import { kaliTheme } from '@/styles/themes/kali';

const buttonStyles = {
  '--focus-ring-color': kaliTheme.focus,
  '--panel-hover': kaliTheme.hover,
  backgroundColor: kaliTheme.panel,
  boxShadow: kaliTheme.shadow,
} as React.CSSProperties;

<button
  className="rounded bg-[var(--panel-hover)] focus-visible:ring-[var(--focus-ring-color)]"
  style={buttonStyles}
>
  Action
</button>
```

* Use component-level CSS custom properties (e.g. `--focus-ring-color`) when Tailwind utilities require an actual colour value.
* Updating a token in `kaliTheme` propagates through all consumers, so prefer those constants over literal `var(--kali-*)` strings.
