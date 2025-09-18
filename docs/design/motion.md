# Motion system

This document introduces the shared motion tokens, presets, and developer tooling that power shell animations. All new animation and transition work should rely on these primitives so the experience respects accessibility settings and stays consistent across the desktop.

## Tokens

Motion tokens live in [`data/design-system/motion.ts`](../../data/design-system/motion.ts). They provide canonical duration and easing values inspired by Kali desktop interactions. Tokens are exposed as CSS variables (`--motion-duration-*`, `--motion-easing-*`, `--motion-transition-*`) by the `MotionProvider` so utilities and raw CSS can consume them directly.

| Token | Value | Usage |
| --- | --- | --- |
| `instant` | `0ms` | snap state changes, non-animated updates |
| `micro` | `50ms` | repeated polling, resize loops |
| `brisk` | `100ms` | active button press feedback |
| `interaction` | `150ms` | hover/focus feedback |
| `reveal` | `200ms` | overlays, app icon launch |
| `settle` | `240ms` | composited movements |
| `window` | `300ms` | window open/close/minimize |
| `modal` | `400ms` | heavier overlays |
| `idle` | `1000ms` | icon echoes, app previews |
| `linger` | `3000ms` | delayed background fades |

Easing tokens follow Material-inspired curves (`standard`, `decelerate`, `accelerate`, `emphasized`, `linear`) and ship alongside a small preset catalog (`shellInteractive`, `shellOverlay`, `shellWindow`, `shellScale`, `systemInertia`). Presets bundle properties, duration, and easing combinations that map to common shell transitions.

## Motion provider

Wrap UI with `MotionProvider` after the settings context to make tokens available and respect the user’s reduced-motion preference:

```tsx
import MotionProvider from '../components/ui/MotionProvider';

<SettingsProvider>
  <MotionProvider>
    <AppShell />
  </MotionProvider>
</SettingsProvider>
```

`MotionProvider`:

- Reads the merged reduced-motion preference via [`useReducedMotion`](../../hooks/useReducedMotion.ts).
- Computes a `MotionSystem` (durations, easings, presets) using [`createMotionSystem`](../../utils/motion.ts).
- Publishes CSS variables to `document.documentElement` so Tailwind helpers and vanilla CSS can use tokenized transitions.
- Optionally renders the developer overlay (enabled in development or by setting `NEXT_PUBLIC_MOTION_DEBUG=true`).

Consume motion data with the `useMotion` hook or via `MotionContext` inside class components:

```tsx
const motion = useMotion();
const fadeIn = motion.presets.shellOverlay;

return (
  <div
    data-motion-preset="shellOverlay"
    style={{ transition: fadeIn.transition }}
  >
    …
  </div>
);
```

Class components can set `static contextType = MotionContext;` and reference `this.context.durations.window` or `this.context.presets.shellWindow.transition` for the same effect.

## Utilities and helpers

`utils/motion.ts` exports `createMotionSystem`, `createTransition`, and shared types. `createTransition` produces transition strings that automatically collapse to `none` when reduced-motion is enabled, ensuring the experience stays accessible without extra branching in components.

Tailwind helpers defined in [`styles/tailwind.css`](../../styles/tailwind.css) now pull from CSS variables instead of hard-coded durations, so existing `transition-hover` / `transition-active` classes automatically align with the new tokens.

## Developer overlay

[`components/devtools/MotionOverlay.tsx`](../../components/devtools/MotionOverlay.tsx) renders a lightweight HUD in development that surfaces:

- Active animations and their targets/presets.
- Average frame time and FPS sampled with `requestAnimationFrame`.
- The effective reduced-motion state (and whether it originated from system settings or in-app preferences).
- Registered motion presets with their resolved durations and easings.

The overlay respects reduced-motion and hides itself automatically in production unless `NEXT_PUBLIC_MOTION_DEBUG=true` is set.

## Lint guard

A custom ESLint rule (`motion/no-raw-motion`) runs against `components/base` and `components/core`. It flags string literals that embed timing values (e.g., `duration-300`, `ease-in-out`, `transition: all 200ms`). Prefer motion tokens and presets instead of raw values to keep the shell consistent and responsive to accessibility settings.

## Migration tips

- Remove Tailwind `duration-*` utilities or inline `transition: …ms` strings from shell components and replace them with preset-driven styles.
- Add `data-motion-preset` attributes to help the overlay map DOM nodes to presets (useful when profiling).
- When you need bespoke motion, call `createTransition({ properties: ['opacity'], duration: 'modal', easing: 'decelerate' })` rather than hard-coding timing strings.
- For timers (`setTimeout`) that align with an animation, source the delay from `motion.durations` so reduced-motion skips unnecessary waits.
