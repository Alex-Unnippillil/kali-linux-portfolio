export type FocusOverrideMode = 'inherit' | 'custom' | 'immediate' | 'mute';

export interface FocusAppOverride {
  mode: FocusOverrideMode;
  schedule?: string[];
}

export interface FocusSettingsState {
  enabled: boolean;
  schedule: string[];
  perAppOverrides: Record<string, FocusAppOverride>;
}
