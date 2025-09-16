/**
 * Motion tokens and helpers used across the desktop experience.
 *
 * The values lean on CSS custom properties declared in `styles/tokens.css`
 * so that global toggles (e.g. reduced motion) can zero out the transitions
 * without every component needing to know about the preference.
 */

export type TransitionPresetName =
  | 'tap'
  | 'hover'
  | 'toggle'
  | 'toggleExit'
  | 'focusRing';

export interface TransitionPreset {
  duration: string;
  easing: string;
  delay?: string;
}

const motionDurations = Object.freeze({
  tap: 'var(--motion-duration-tap, 120ms)',
  hover: 'var(--motion-duration-hover, 180ms)',
  toggle: 'var(--motion-duration-toggle, 240ms)',
  focusRing: 'var(--motion-duration-focus, 200ms)',
});

const motionEasings = Object.freeze({
  standard: 'var(--motion-ease-standard, cubic-bezier(0.4, 0, 0.2, 1))',
  emphasized: 'var(--motion-ease-emphasized, cubic-bezier(0.2, 0, 0, 1))',
  exit: 'var(--motion-ease-exit, cubic-bezier(0.4, 0, 1, 1))',
});

export const transitionPresets: Record<TransitionPresetName, TransitionPreset> = Object.freeze({
  tap: {
    duration: motionDurations.tap,
    easing: motionEasings.emphasized,
  },
  hover: {
    duration: motionDurations.hover,
    easing: motionEasings.standard,
  },
  toggle: {
    duration: motionDurations.toggle,
    easing: motionEasings.emphasized,
  },
  toggleExit: {
    duration: motionDurations.toggle,
    easing: motionEasings.exit,
  },
  focusRing: {
    duration: motionDurations.focusRing,
    easing: motionEasings.standard,
  },
});

export type SpringPresetName = 'tap' | 'hover' | 'toggle' | 'panel';

export interface SpringPreset {
  stiffness: number;
  damping: number;
  mass?: number;
  restSpeed?: number;
  restDelta?: number;
  clamp?: boolean;
}

export const springPresets: Record<SpringPresetName, SpringPreset> = Object.freeze({
  tap: {
    stiffness: 620,
    damping: 38,
    mass: 0.9,
    restSpeed: 0.01,
    restDelta: 0.01,
  },
  hover: {
    stiffness: 360,
    damping: 30,
    mass: 1,
    restSpeed: 0.02,
    restDelta: 0.02,
  },
  toggle: {
    stiffness: 420,
    damping: 32,
    mass: 1,
    restSpeed: 0.02,
    restDelta: 0.02,
  },
  panel: {
    stiffness: 320,
    damping: 34,
    mass: 1.1,
    restSpeed: 0.02,
    restDelta: 0.02,
  },
});

const DEFAULT_DELAY = '0ms';

type TransitionConfig = {
  properties: string | string[];
  preset: TransitionPresetName | TransitionPreset;
  delay?: string;
};

function resolvePreset(preset: TransitionPresetName | TransitionPreset): TransitionPreset {
  return typeof preset === 'string' ? transitionPresets[preset] : preset;
}

export function buildTransition(
  properties: string | string[],
  preset: TransitionPresetName | TransitionPreset,
  options: { delay?: string } = {},
): string {
  const resolved = resolvePreset(preset);
  const props = Array.isArray(properties) ? properties : [properties];
  const delay = options.delay ?? resolved.delay;
  return props
    .filter(Boolean)
    .map((property) =>
      [property, resolved.duration, resolved.easing, delay ?? DEFAULT_DELAY]
        .filter(Boolean)
        .join(' '),
    )
    .join(', ');
}

export function composeTransitions(...entries: TransitionConfig[]): string {
  const values = entries
    .map((entry) =>
      buildTransition(entry.properties, entry.preset, { delay: entry.delay }),
    )
    .filter(Boolean);
  return values.length > 0 ? values.join(', ') : 'none';
}

export function transitionStyles(
  ...entries: TransitionConfig[]
): { transition: string } {
  return { transition: composeTransitions(...entries) };
}

export const motionTokens = Object.freeze({
  durations: motionDurations,
  easings: motionEasings,
  transitions: transitionPresets,
  springs: springPresets,
});
