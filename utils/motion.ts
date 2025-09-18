import {
  motionDurations,
  motionEasings,
  motionPresets,
  type MotionDurationToken,
  type MotionEasingToken,
  type MotionPresetDefinition,
  type MotionPresetToken,
} from '../data/design-system/motion';

type MotionDurationInput = MotionDurationToken | number | undefined;
type MotionDelayInput = MotionDurationInput;
type MotionEasingInput = MotionEasingToken | string | undefined;

export interface MotionTransitionConfig {
  properties?: string[];
  duration?: MotionDurationInput;
  easing?: MotionEasingInput;
  delay?: MotionDelayInput;
}

export interface MotionOverrides {
  durations?: Partial<Record<MotionDurationToken, number>>;
  easings?: Partial<Record<MotionEasingToken, string>>;
  presets?: Partial<Record<MotionPresetToken, Partial<MotionPresetDefinition>>>;
}

export interface MotionSystemOptions {
  reducedMotion?: boolean;
  overrides?: MotionOverrides;
}

export interface TransitionComputation {
  transition: string;
  duration: number;
  delay: number;
  easing: string;
  properties: string[];
}

export interface MotionPresetResolved extends TransitionComputation {
  name: MotionPresetToken;
  definition: MotionPresetDefinition;
  durationToken: MotionDurationToken;
  delayToken: MotionDurationToken | null;
  easingToken: MotionEasingToken;
  style: Record<string, string>;
}

export interface MotionSystem {
  durations: Record<MotionDurationToken, number>;
  easings: Record<MotionEasingToken, string>;
  presets: Record<MotionPresetToken, MotionPresetResolved>;
  reducedMotion: boolean;
  createTransition: (config?: MotionTransitionConfig) => string;
  cssVariables: Record<string, string>;
}

const DEFAULT_DURATION: MotionDurationToken = 'interaction';
const DEFAULT_DELAY: MotionDurationToken = 'instant';
const DEFAULT_EASING: MotionEasingToken = 'standard';

const ensureProperties = (properties?: string[]): string[] => {
  if (!properties || properties.length === 0) {
    return ['all'];
  }
  return properties.filter(Boolean);
};

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();

const resolveDurationValue = (
  value: MotionDurationInput,
  durations: Record<MotionDurationToken, number>,
  reducedMotion: boolean,
): number => {
  if (typeof value === 'number') {
    return reducedMotion && value !== 0 ? 0 : value;
  }
  const token = value ?? DEFAULT_DURATION;
  const base = durations[token] ?? durations[DEFAULT_DURATION] ?? 0;
  return reducedMotion && base !== 0 ? 0 : base;
};

const resolveEasingValue = (
  easing: MotionEasingInput,
  easings: Record<MotionEasingToken, string>,
): string => {
  if (!easing) {
    return easings[DEFAULT_EASING];
  }
  if (typeof easing === 'string' && easing in easings) {
    return easings[easing as MotionEasingToken];
  }
  return easing.toString();
};

const toCssVariables = <T>(
  prefix: string,
  values: Record<string, T>,
  formatter: (value: T) => string,
): Record<string, string> =>
  Object.entries(values).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[`--motion-${prefix}-${toKebabCase(key)}`] = formatter(value);
    return acc;
  }, {});

export const createTransition = (
  config: MotionTransitionConfig = {},
  options: MotionSystemOptions = {},
): TransitionComputation => {
  const { reducedMotion = false, overrides } = options;
  const durations = {
    ...motionDurations,
    ...(overrides?.durations ?? {}),
  } as Record<MotionDurationToken, number>;
  const easings = {
    ...motionEasings,
    ...(overrides?.easings ?? {}),
  } as Record<MotionEasingToken, string>;

  const properties = ensureProperties(config.properties);
  const duration = resolveDurationValue(config.duration, durations, reducedMotion);
  const delay = resolveDurationValue(config.delay ?? DEFAULT_DELAY, durations, reducedMotion);
  const easing = resolveEasingValue(config.easing, easings);

  if (reducedMotion) {
    return {
      transition: 'none',
      duration,
      delay,
      easing,
      properties,
    };
  }

  const transition = properties
    .map((property) => `${property} ${duration}ms ${easing} ${delay}ms`)
    .join(', ');

  return {
    transition,
    duration,
    delay,
    easing,
    properties,
  };
};

export const createMotionSystem = (
  options: MotionSystemOptions = {},
): MotionSystem => {
  const { reducedMotion = false, overrides } = options;

  const durations = {
    ...motionDurations,
    ...(overrides?.durations ?? {}),
  } as Record<MotionDurationToken, number>;

  const easings = {
    ...motionEasings,
    ...(overrides?.easings ?? {}),
  } as Record<MotionEasingToken, string>;

  const effectiveDurations = Object.keys(durations).reduce<Record<MotionDurationToken, number>>(
    (acc, key) => {
      const typedKey = key as MotionDurationToken;
      const value = durations[typedKey];
      acc[typedKey] = reducedMotion && value !== 0 ? 0 : value;
      return acc;
    },
    {} as Record<MotionDurationToken, number>,
  );

  const presetDefinitions = Object.keys(motionPresets).reduce<Record<MotionPresetToken, MotionPresetDefinition>>(
    (acc, key) => {
      const typedKey = key as MotionPresetToken;
      acc[typedKey] = {
        ...motionPresets[typedKey],
        ...(overrides?.presets?.[typedKey] ?? {}),
      };
      return acc;
    },
    {} as Record<MotionPresetToken, MotionPresetDefinition>,
  );

  const presets = Object.keys(presetDefinitions).reduce<Record<MotionPresetToken, MotionPresetResolved>>(
    (acc, key) => {
      const typedKey = key as MotionPresetToken;
      const definition = presetDefinitions[typedKey];
      const computation = createTransition(definition, {
        reducedMotion,
        overrides: {
          durations: effectiveDurations,
          easings,
        },
      });

      acc[typedKey] = {
        name: typedKey,
        definition,
        durationToken: definition.duration,
        delayToken: typeof definition.delay === 'string' ? definition.delay : null,
        easingToken: definition.easing,
        ...computation,
        style: { transition: computation.transition },
      };
      return acc;
    },
    {} as Record<MotionPresetToken, MotionPresetResolved>,
  );

  const cssVariables = {
    ...toCssVariables('duration', effectiveDurations, (value) => `${value}ms`),
    ...toCssVariables('easing', easings, (value) => value),
    ...toCssVariables('transition', presets, (preset) => preset.transition),
  };

  return {
    durations: effectiveDurations,
    easings,
    presets,
    reducedMotion,
    createTransition: (config = {}) =>
      createTransition(config, {
        reducedMotion,
        overrides: {
          durations: effectiveDurations,
          easings,
        },
      }).transition,
    cssVariables,
  };
};

export const defaultMotionSystem = createMotionSystem();
