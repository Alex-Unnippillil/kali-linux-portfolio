import apps from '../apps.config';

export interface AppAttentionState {
  badgeCount: number;
  pulse: boolean;
}

export type AppAttentionStateMap = Record<string, AppAttentionState>;

const DEFAULT_ATTENTION_TEMPLATE: AppAttentionState = {
  badgeCount: 0,
  pulse: false,
};

const attentionOverrides: Partial<AppAttentionStateMap> = {
  // Apps that typically expose notification counts can seed defaults here.
  todoist: { badgeCount: 0, pulse: false },
  'clipboard-manager': { badgeCount: 0, pulse: false },
};

export const appAttentionMetadata: AppAttentionStateMap = apps.reduce(
  (acc, app) => {
    const override = attentionOverrides[app.id];
    acc[app.id] = {
      badgeCount:
        typeof override?.badgeCount === 'number' && override.badgeCount > 0
          ? Math.floor(override.badgeCount)
          : DEFAULT_ATTENTION_TEMPLATE.badgeCount,
      pulse: override?.pulse ?? DEFAULT_ATTENTION_TEMPLATE.pulse,
    };
    return acc;
  },
  {} as AppAttentionStateMap
);

export const createAttentionState = (
  base: Partial<AppAttentionState> | undefined
): AppAttentionState => ({
  badgeCount:
    typeof base?.badgeCount === 'number' && base.badgeCount > 0
      ? Math.floor(base.badgeCount)
      : DEFAULT_ATTENTION_TEMPLATE.badgeCount,
  pulse: base?.pulse ?? DEFAULT_ATTENTION_TEMPLATE.pulse,
});

export const buildInitialAttentionState = (
  ids: string[],
  seed: AppAttentionStateMap = {}
): AppAttentionStateMap => {
  const map: AppAttentionStateMap = {};
  ids.forEach((id) => {
    const meta = appAttentionMetadata[id];
    const existing = seed[id];
    map[id] = existing ? createAttentionState(existing) : createAttentionState(meta);
  });
  return map;
};

export const DEFAULT_ATTENTION_STATE: AppAttentionState = {
  ...DEFAULT_ATTENTION_TEMPLATE,
};
