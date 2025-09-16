# Motion presets and interaction patterns

To keep desktop interactions cohesive we centralise all motion tokens and helper utilities in `src/motion/presets.ts`. These presets mirror the CSS custom properties declared in `styles/tokens.css`, so the existing reduced-motion toggles and media queries continue to work without additional code inside each component.

## Token overview

| Token | CSS variable | Default | Notes |
| --- | --- | --- | --- |
| `motionTokens.durations.tap` | `--motion-duration-tap` | `120ms` | Quick press/tap feedback. |
| `motionTokens.durations.hover` | `--motion-duration-hover` | `180ms` | Standard hover state transitions. |
| `motionTokens.durations.toggle` | `--motion-duration-toggle` | `240ms` | Visibility or layout toggles (drawers, toast). |
| `motionTokens.durations.focusRing` | `--motion-duration-focus` | `200ms` | Focus outlines and keyboard cues. |
| `motionTokens.easings.standard` | `--motion-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default ease for soft hover/focus. |
| `motionTokens.easings.emphasized` | `--motion-ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Snappier response for taps/toggles. |
| `motionTokens.easings.exit` | `--motion-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Decelerated exit transitions. |

Spring presets are exported for libraries such as Framer Motion or React Spring when we need physics-based interactions:

| Preset | Config |
| --- | --- |
| `springPresets.tap` | `{ stiffness: 620, damping: 38, mass: 0.9, restSpeed: 0.01, restDelta: 0.01 }` |
| `springPresets.hover` | `{ stiffness: 360, damping: 30, mass: 1, restSpeed: 0.02, restDelta: 0.02 }` |
| `springPresets.toggle` | `{ stiffness: 420, damping: 32, mass: 1, restSpeed: 0.02, restDelta: 0.02 }` |
| `springPresets.panel` | `{ stiffness: 320, damping: 34, mass: 1.1, restSpeed: 0.02, restDelta: 0.02 }` |

## Helper utilities

`transitionStyles` and `composeTransitions` convert presets into CSS-ready strings:

```tsx
import { transitionStyles } from '@/src/motion/presets';

const buttonMotion = transitionStyles(
  { properties: ['background-color', 'border-color', 'color'], preset: 'hover' },
  { properties: 'transform', preset: 'tap' },
);

<button style={buttonMotion}>Launch</button>;
```

Use `buildTransition` when you need a raw transition string (for example to mix with inline `transition` values or Tailwind overrides).

Because the presets reference CSS variables, reduced-motion preferences automatically collapse durations to `0ms`. Avoid adding manual `matchMedia('(prefers-reduced-motion)')` checks unless an animation requires deeper changes than a simple duration tweak.

## Usage guidance

* Prefer `transitionStyles` for hover, tap, or toggle interactions instead of hard-coded Tailwind duration/easing classes.
* When you need the same motion across multiple components, create a shared constant near the top of the file (e.g. `const MENU_BUTTON_MOTION = transitionStyles(...)`).
* Reach for `springPresets` when adding Framer Motion/React Spring powered effects so the feeling stays consistent with the rest of the desktop.
* If you introduce a new interaction pattern, extend `presets.ts` rather than sprinkling bespoke values in components. Update this document with the rationale so future changes stay aligned.
