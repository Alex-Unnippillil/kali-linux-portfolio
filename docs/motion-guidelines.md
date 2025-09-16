# Motion guidelines

This project now exposes a small motion library so interactions across the desktop feel consistent.
It has two parts: CSS design tokens in `styles/tokens.css` and a TypeScript helper in
`src/motion/presets.ts`.

## Interaction tokens

The CSS tokens provide named durations and easing curves for the most common interactions:

- `--motion-duration-tap` — quick responses for press/tap feedback (100 ms)
- `--motion-duration-hover` — hover and focus states (150 ms)
- `--motion-duration-toggle` — longer transitions for toggle switches (200 ms)
- `--motion-ease-standard` — the default curve (`cubic-bezier(0.16, 1, 0.3, 1)`)
- `--motion-ease-emphasized` — a snappier curve for press feedback (`cubic-bezier(0.33, 1, 0.68, 1)`)

Utility classes in `styles/tailwind.css` apply these tokens:

- `transition-hover` configures hover/focus transitions with the standard easing
- `transition-active` uses the tap duration and emphasized easing for snappy feedback

Buttons automatically pick up the hover preset and fall back to the tap preset while pressed.
When reduced-motion is enabled the durations collapse to zero so that transitions disappear.

## TypeScript presets

Import helpers from `src/motion/presets.ts` when you need to author transitions or springs in
JavaScript/TypeScript components.

```ts
import { buildTransition, getSpringPreset } from "@/src/motion/presets";

const toggleTransition = buildTransition("toggle", ["transform"]);
const hoverSpring = getSpringPreset("hover");
```

- `buildTransition()` accepts an interaction name (`tap`, `hover`, or `toggle`) and an optional
  list of CSS properties. It returns a comma-delimited transition string that uses the shared
  duration and easing curve. Use it for inline `style.transition` values when Tailwind utilities
  are not enough. The helper references the CSS custom properties so reduced-motion preferences
  still collapse the durations to zero.
- `getSpringPreset()` returns a Framer Motion–compatible spring configuration tuned for the same
  interactions. Pass the preset directly to `animate`/`whileHover`/`whileTap` props. The presets
  share the same duration envelope so switches, hover cards, and tap feedback animate at similar
  speeds.

Both helpers use the `interactionMotion` tokens exported from the same module. If you extend the
system with a new interaction, update the CSS tokens and the TypeScript module in tandem.

## Usage checklist

1. Use `transition-hover` and `transition-active` utilities for hoverable or pressable UI.
2. Prefer `buildTransition()` for inline transitions instead of hard-coded durations.
3. Reach for `getSpringPreset()` whenever you configure a spring (Framer Motion, Motion One, etc.).
4. Never bypass the tokens for app-specific values unless animation timing is part of the feature
   (e.g., minigames). Otherwise transitions across the desktop drift apart over time.
5. Verify animations still respect reduced-motion by testing with the OS/browser flag.
