export type FeatureFlagEnvironment = 'client' | 'server';

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string;
  environment: FeatureFlagEnvironment;
  /** Default enabled state when no environment variable is set. */
  defaultState?: boolean;
  /** Accepted truthy string values when resolving the flag. */
  truthyValues?: string[];
  /** Flag keys that must evaluate to enabled before this flag is considered on. */
  requires?: string[];
  /** Optional environment variable name that stores the rollout percentage. */
  rolloutEnv?: string;
  /** Default rollout percentage when none is configured. */
  defaultRollout?: number;
  /** Optional link for additional operator guidance. */
  docsUrl?: string;
}

export interface FeatureFlagMetadata extends FeatureFlagDefinition {
  rawValue?: string;
  enabled: boolean;
  source: 'environment' | 'default';
  status: 'enabled' | 'disabled';
  rolloutPercentage: number;
  notes?: string;
}

const DEFAULT_TRUTHY = ['true', '1', 'enabled', 'on', 'yes'];

const definitions: FeatureFlagDefinition[] = [
  {
    key: 'NEXT_PUBLIC_ENABLE_ANALYTICS',
    name: 'Client analytics',
    description: 'Turns on the GA4 wrapper on the client when set to "true".',
    environment: 'client',
    defaultState: false,
    truthyValues: ['true'],
    rolloutEnv: 'NEXT_PUBLIC_ENABLE_ANALYTICS_ROLLOUT',
  },
  {
    key: 'NEXT_PUBLIC_DEMO_MODE',
    name: 'Demo mode',
    description: 'Forces simulated tooling to stay in demo flows instead of real requests.',
    environment: 'client',
    defaultState: false,
    truthyValues: ['true'],
    rolloutEnv: 'NEXT_PUBLIC_DEMO_MODE_ROLLOUT',
  },
  {
    key: 'NEXT_PUBLIC_UI_EXPERIMENTS',
    name: 'UI experiments',
    description: 'Enables experimental desktop heuristics guarded behind the UI experiments flag.',
    environment: 'client',
    defaultState: false,
    truthyValues: ['true'],
    rolloutEnv: 'NEXT_PUBLIC_UI_EXPERIMENTS_ROLLOUT',
  },
  {
    key: 'NEXT_PUBLIC_STATIC_EXPORT',
    name: 'Static export mode',
    description: 'Disables live APIs when running static exports. Expected during `yarn export`.',
    environment: 'client',
    defaultState: false,
    truthyValues: ['true'],
    rolloutEnv: 'NEXT_PUBLIC_STATIC_EXPORT_ROLLOUT',
  },
  {
    key: 'NEXT_PUBLIC_SHOW_BETA',
    name: 'Beta badge',
    description: 'Shows a beta badge in the top chrome when set to 1.',
    environment: 'client',
    defaultState: false,
    truthyValues: ['1', 'true'],
    rolloutEnv: 'NEXT_PUBLIC_SHOW_BETA_ROLLOUT',
  },
  {
    key: 'FEATURE_TOOL_APIS',
    name: 'Tool API routes',
    description: 'Enables all simulated offensive tooling API routes (Hydra, John, etc.).',
    environment: 'server',
    defaultState: false,
    truthyValues: ['enabled'],
    rolloutEnv: 'FEATURE_TOOL_APIS_ROLLOUT',
  },
  {
    key: 'FEATURE_HYDRA',
    name: 'Hydra API',
    description: 'Allows the Hydra password attack simulation API route to execute.',
    environment: 'server',
    defaultState: false,
    truthyValues: ['enabled'],
    requires: ['FEATURE_TOOL_APIS'],
    rolloutEnv: 'FEATURE_HYDRA_ROLLOUT',
  },
];

export function getFeatureFlagDefinitions(): FeatureFlagDefinition[] {
  return [...definitions];
}

function parseRollout(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, parsed));
}

export function getFeatureFlagMetadata(): FeatureFlagMetadata[] {
  const metadataMap = new Map<string, FeatureFlagMetadata>();

  return definitions.map((definition) => {
    const rawValue = process.env[definition.key];
    const truthyValues = definition.truthyValues ?? DEFAULT_TRUTHY;
    const normalized = rawValue?.toLowerCase();
    const isExplicitlySet = typeof rawValue !== 'undefined';
    const defaultState = definition.defaultState ?? false;
    const enabledFromEnv = normalized ? truthyValues.includes(normalized) : defaultState;

    let enabled = enabledFromEnv;
    const dependencyNotes: string[] = [];

    if (definition.requires?.length) {
      for (const dependencyKey of definition.requires) {
        const dependency = metadataMap.get(dependencyKey);
        if (!dependency || !dependency.enabled) {
          enabled = false;
          dependencyNotes.push(
            `Requires ${dependency?.name ?? dependencyKey} to be enabled`,
          );
        }
      }
    }

    const source: FeatureFlagMetadata['source'] = isExplicitlySet
      ? 'environment'
      : 'default';

    const fallbackRollout =
      definition.defaultRollout ?? (enabled ? 100 : 0);
    const rolloutPercentage = parseRollout(
      definition.rolloutEnv ? process.env[definition.rolloutEnv] : undefined,
      fallbackRollout,
    );

    const entry: FeatureFlagMetadata = {
      ...definition,
      rawValue,
      enabled,
      source,
      status: enabled ? 'enabled' : 'disabled',
      rolloutPercentage,
    };

    if (dependencyNotes.length) {
      entry.notes = dependencyNotes.join('. ');
    }

    metadataMap.set(definition.key, entry);
    return entry;
  });
}
