import spacingTokens from './spacing-scale.json';

type SpacingTokenMap = Readonly<Record<string, string>>;

export const spacingSteps = Object.freeze(spacingTokens) as SpacingTokenMap;

export type SpacingToken = keyof typeof spacingSteps;

export const spacingInPixels: Readonly<Record<SpacingToken, number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(spacingSteps).map(([token, value]) => [
      token,
      value.endsWith('rem') ? parseFloat(value) * 16 : parseFloat(value.replace('px', '')),
    ]),
  ) as Record<SpacingToken, number>,
);

export const getSpacingValue = (token: SpacingToken): string => spacingSteps[token];
