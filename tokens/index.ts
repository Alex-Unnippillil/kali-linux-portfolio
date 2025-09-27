import designTokens from './design-tokens.json';

type Primitive = string | number | boolean | null | undefined;

type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends Array<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : { readonly [K in keyof T]: DeepReadonly<T[K]> };

const deepFreeze = <T extends Record<string, unknown>>(object: T): DeepReadonly<T> => {
  const entries = Object.entries(object).map(([key, value]) => {
    if (value && typeof value === 'object') {
      return [key, deepFreeze(value as Record<string, unknown>)];
    }

    return [key, value];
  });

  return Object.freeze(Object.fromEntries(entries)) as DeepReadonly<T>;
};

const tokens = deepFreeze(designTokens);

export const colors = tokens.colors;
export const spacing = tokens.spacing;
export const radii = tokens.radii;
export const shadows = tokens.shadows;
export const zIndex = tokens.zIndex;

export type ColorToken = keyof typeof colors;
export type KaliColorToken = keyof typeof colors.kali;
export type GameColorToken = keyof typeof colors.game;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
export type BoxShadowToken = keyof typeof shadows.box;
export type DropShadowToken = keyof typeof shadows.drop;
export type ZIndexToken = keyof typeof zIndex;

export default tokens;
