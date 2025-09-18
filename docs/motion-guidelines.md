# Motion Guidelines

This project standardizes UI motion so that interactive feedback feels consistent and remains accessible for users who prefer reduced effects. Use the helpers described below whenever you introduce transitions or animations.

## JavaScript presets

Use the utilities in [`utils/motion.ts`](../utils/motion.ts) instead of hard-coding animation timings.

```ts
import { fade, spring, transitionString } from '../utils/motion';

const widthTransition = transitionString('width', fade());
const { duration, easing } = spring();
```

* `spring()` and `fade()` enforce a 450&nbsp;ms timing cap and automatically fall back to zero-duration linear transitions when the user (or quick settings) enables reduced motion.
* Pass `{ reducedMotion: boolean }` if you already computed the preference for the current component.
* `transitionString(property, timing)` returns a `transition` value that you can drop into inline styles or Web Animations options.
* The exported `motionDurations` and `motionEasings` objects surface the default values for tests or other tooling.

## CSS custom properties and helper classes

The design tokens in [`styles/tokens.css`](../styles/tokens.css) expose reusable motion variables:

* `--motion-duration-spring` / `--motion-duration-fade`
* `--motion-ease-spring` / `--motion-ease-fade`

The global stylesheet defines utility classes that work with Tailwind’s `transition-*` helpers:

```html
<div class="transition-transform motion-duration-spring motion-ease-spring">…</div>
<div class="transition-all motion-duration-fade motion-ease-fade">…</div>
```

Use these classes (or the `.motion-fade` / `.motion-spring` shorthands) to keep timing consistent across JSX and static CSS. They automatically resolve to `0ms` when `prefers-reduced-motion` or the in-app quick setting is enabled.

## Reduced-motion behaviour

* The Quick Settings panel toggles the `reduce-motion`/`reduced-motion` classes on `<html>`. The motion helpers respect both, so you do not need to add extra guards.
* Avoid duplicating `matchMedia('(prefers-reduced-motion: reduce)')` checks unless a component must react immediately to the user preference. In most cases the motion utilities and CSS tokens provide the correct fallback automatically.
* If you add bespoke keyframe animations, reference `var(--motion-duration-fade)` or `var(--motion-duration-spring)` and set a sensible easing (`var(--motion-ease-*)`).

Keeping all animation primitives in one place makes it easier to tune the experience, run audits, and deliver accessible motion defaults.
