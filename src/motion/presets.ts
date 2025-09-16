export type InteractionName = 'tap' | 'hover' | 'toggle';

export type SpringPreset = {
  type: 'spring';
  stiffness: number;
  damping: number;
  mass: number;
  restSpeed: number;
  restDelta: number;
};

export const motionDurations = {
  tap: 100,
  hover: 150,
  toggle: 200,
} as const satisfies Record<InteractionName, number>;

export const motionEasings = {
  standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
  emphasized: 'cubic-bezier(0.33, 1, 0.68, 1)',
} as const;

const durationVariables = {
  tap: '--motion-duration-tap',
  hover: '--motion-duration-hover',
  toggle: '--motion-duration-toggle',
} as const satisfies Record<InteractionName, `--${string}`>;

export const interactionMotion = {
  tap: {
    duration: motionDurations.tap,
    easing: motionEasings.emphasized,
    cssVar: durationVariables.tap,
  },
  hover: {
    duration: motionDurations.hover,
    easing: motionEasings.standard,
    cssVar: durationVariables.hover,
  },
  toggle: {
    duration: motionDurations.toggle,
    easing: motionEasings.standard,
    cssVar: durationVariables.toggle,
  },
} as const satisfies Record<InteractionName, { duration: number; easing: string; cssVar: string }>;

const baseSpring: Omit<SpringPreset, 'stiffness' | 'damping' | 'mass'> = {
  type: 'spring',
  restSpeed: 0.01,
  restDelta: 0.001,
};

export const springPresets: Record<InteractionName, SpringPreset> = {
  tap: {
    ...baseSpring,
    stiffness: 420,
    damping: 35,
    mass: 0.9,
  },
  hover: {
    ...baseSpring,
    stiffness: 260,
    damping: 30,
    mass: 1,
  },
  toggle: {
    ...baseSpring,
    stiffness: 320,
    damping: 28,
    mass: 1,
  },
} as const;

export function getSpringPreset(name: InteractionName): SpringPreset {
  return springPresets[name];
}

export function buildTransition(
  name: InteractionName,
  properties: string[] = ['all'],
): string {
  const { duration, easing, cssVar } = interactionMotion[name];
  const durationToken = `var(${cssVar}, ${duration}ms)`;
  const list = properties.length > 0 ? properties : ['all'];
  return list.map((property) => `${property} ${durationToken} ${easing}`).join(', ');
}
