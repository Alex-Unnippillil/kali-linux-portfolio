# Motion system and micro-interactions

The portfolio UI exposes a set of reusable micro-interaction hooks under
`components/ui/micro-interactions/`. These hooks centralise motion behaviour so that
press, hold, shimmer, shake, pulse and snap effects stay consistent with the
Ubuntu/Kali themed design tokens and accessibility rules.

## Available hooks

| Hook | Purpose | Default amplitude | Default duration |
| ---- | ------- | ----------------- | ---------------- |
| `usePressInteraction` | Provides press feedback by scaling and shadowing a control while it is pressed. | `0.08` | token `--motion-fast` |
| `useHoldInteraction` | Shows progressive feedback for long presses with a configurable commit threshold. | `0.25` | token `--motion-medium` |
| `useShimmerInteraction` | Creates a loading shimmer driven by tokenised highlight intensity. | `0.35` | token `--motion-slow` |
| `useShakeInteraction` | Adds a one-shot shake animation for attention or error cues. | `0.55` | token `--motion-medium` |
| `usePulseInteraction` | Emits a pulse beacon animation suitable for status chips and toasts. | `0.32` | token `--motion-medium` |
| `useSnapInteraction` | Snaps content into place with a short overshoot easing curve. | `0.42` | token `--motion-fast` |

All hooks accept `amplitude` and `duration` overrides so you can fine-tune the
magnitude and timing per use-case.【F:components/ui/micro-interactions/index.ts†L1-L18】

### Reduced motion

Each hook delegates to `useReducedMotion`, which in turn uses the global
settings toggle and the `prefers-reduced-motion` media query. When reduced
motion is enabled, animations either remove transforms entirely or collapse to
instant transitions. Consumers do not need to guard this manually—spreading the
returned props is sufficient.【F:components/ui/micro-interactions/utils.ts†L25-L50】【F:components/ui/micro-interactions/usePress.ts†L9-L56】

### Token access

Utility helpers expose `useDesignToken` and `useDuration` to read live values
from the token CSS. Hooks and previews re-evaluate automatically when the root
`class` or `style` attributes change (for example when switching to high
contrast mode).【F:components/ui/micro-interactions/utils.ts†L32-L64】

## Design portal previews

The Design Portal app (`/apps/design-portal`) acts as a Storybook-like
playground. It displays each pattern, shows current motion token values and
exposes knobs for amplitude and duration. The previews share the same hooks as
production components, so any design-system updates propagate automatically.【F:apps/design-portal/index.tsx†L1-L208】

Key accessibility behaviours covered by the previews include:

- Live indication of the `prefers-reduced-motion` state.
- Visual progress feedback for the long-press pattern.
- Test hooks that confirm background/text contrast remains ≥ 4.5:1.

## Testing

Playwright accessibility tests exercise the design portal to verify colour
contrast and reduced-motion behaviour. The tests live under
`tests/accessibility/` and can be run via `npx playwright test` or `yarn test`
(if configured to proxy to Playwright).【F:tests/accessibility/micro-interactions.spec.ts†L1-L36】
