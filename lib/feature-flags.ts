import { getProviderData, type KeyedFlagDefinitionType } from 'flags/next';

const flagDefinitions: Record<string, KeyedFlagDefinitionType> = {
  betaBadge: {
    key: 'beta-badge',
    description: 'Show the Beta badge on the desktop shell.',
    defaultValue: false,
    declaredInCode: true,
    options: [
      { label: 'Hidden', value: false },
      { label: 'Visible', value: true },
    ],
  },
};

const providerData = getProviderData(flagDefinitions);

export const featureFlagDefinitions = providerData.definitions;

export type FeatureFlagKey = keyof typeof flagDefinitions;

export const FEATURE_FLAG_KEYS = Object.freeze(
  Object.keys(flagDefinitions) as FeatureFlagKey[],
);

export function getFeatureFlagValues(): Record<string, boolean> {
  const betaBadgeEnabled = process.env.NEXT_PUBLIC_SHOW_BETA === '1';

  return {
    'beta-badge': betaBadgeEnabled,
  };
}

export function isBetaBadgeEnabled(): boolean {
  return getFeatureFlagValues()['beta-badge'];
}
