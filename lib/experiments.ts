export type ExperimentMetricGoal = 'increase' | 'decrease';

export interface ExperimentMetric {
  id: string;
  description: string;
  goal: ExperimentMetricGoal;
  aggregation: 'rate' | 'count';
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export interface ExperimentDefinition {
  id: string;
  name: string;
  description: string;
  audience: string;
  status: 'active' | 'holdback' | 'paused';
  metrics: ExperimentMetric[];
  variants: ExperimentVariant[];
}

type ExperimentRegistry = Record<string, ExperimentDefinition>;

const experimentRegistry: ExperimentRegistry = {
  'launcher-density': {
    id: 'launcher-density',
    name: 'Launcher density tuning',
    description:
      'Evaluate whether a denser app launcher grid improves discovery without hurting engagement.',
    audience: 'All desktop visitors with analytics enabled',
    status: 'active',
    metrics: [
      {
        id: 'apps.launch_rate',
        description: 'Rate of app launches per session from the launcher grid.',
        goal: 'increase',
        aggregation: 'rate',
      },
      {
        id: 'launcher.secondary_navigation',
        description: 'Frequency of opening folders or context menus inside the launcher.',
        goal: 'increase',
        aggregation: 'count',
      },
    ],
    variants: [
      {
        id: 'control',
        name: 'Control layout',
        description: 'Baseline launcher grid spacing and typography.',
        weight: 0.5,
      },
      {
        id: 'compact',
        name: 'Compact grid',
        description: 'Tighter spacing with smaller titles to surface more apps above the fold.',
        weight: 0.3,
      },
      {
        id: 'comfortable',
        name: 'Comfortable grid',
        description: 'Slightly larger tiles and padding for accessibility.',
        weight: 0.2,
      },
    ],
  },
  'window-chrome': {
    id: 'window-chrome',
    name: 'Window chrome controls',
    description:
      'Test a high-contrast window chrome treatment to improve discoverability of drag handles.',
    audience: 'Desktop visitors using simulated terminal or IDE apps',
    status: 'active',
    metrics: [
      {
        id: 'window.resize_interactions',
        description: 'Count of unique resize drag events per session.',
        goal: 'increase',
        aggregation: 'count',
      },
      {
        id: 'window.focus_retention',
        description: 'Rate of sessions keeping a simulated app focused for more than 60 seconds.',
        goal: 'increase',
        aggregation: 'rate',
      },
    ],
    variants: [
      {
        id: 'default',
        name: 'Default chrome',
        description: 'Existing window chrome design with subtle borders.',
        weight: 0.5,
      },
      {
        id: 'contrast',
        name: 'High contrast',
        description: 'Bolder resize handles and window controls.',
        weight: 0.5,
      },
    ],
  },
};

export type ExperimentId = keyof typeof experimentRegistry;

const HASH_SPACE = 10000;

const hashIdentifier = (experimentId: string, unitId: string): number => {
  const input = `${experimentId}:${unitId}`;
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0; // Keep as 32-bit integer
  }
  return Math.abs(hash) % HASH_SPACE;
};

const pickVariant = (experiment: ExperimentDefinition, normalizedPoint: number): ExperimentVariant => {
  const totalWeight = experiment.variants.reduce((acc, variant) => acc + Math.max(variant.weight, 0), 0);
  if (totalWeight <= 0) {
    return experiment.variants[0];
  }

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += Math.max(variant.weight, 0);
    if (normalizedPoint <= cumulative / totalWeight) {
      return variant;
    }
  }

  return experiment.variants[experiment.variants.length - 1];
};

export const listExperiments = (): ExperimentDefinition[] => Object.values(experimentRegistry);

export const getExperimentDefinition = (
  id: ExperimentId,
): ExperimentDefinition | undefined => experimentRegistry[id];

export const assignExperimentVariant = (
  id: ExperimentId,
  unitId: string,
): ExperimentVariant | undefined => {
  const experiment = experimentRegistry[id];
  if (!experiment) {
    return undefined;
  }

  if (!unitId) {
    return experiment.variants[0];
  }

  const bucket = hashIdentifier(id, unitId) / HASH_SPACE;
  return pickVariant(experiment, bucket);
};

export type AssignedExperiment = {
  experiment: ExperimentDefinition;
  variant: ExperimentVariant;
};

export const assignExperiment = (id: ExperimentId, unitId: string): AssignedExperiment | undefined => {
  const experiment = experimentRegistry[id];
  if (!experiment) {
    return undefined;
  }

  const variant = assignExperimentVariant(id, unitId) ?? experiment.variants[0];
  return { experiment, variant };
};

export const experiments = experimentRegistry;

export const __internal = {
  hashIdentifier,
  pickVariant,
};
