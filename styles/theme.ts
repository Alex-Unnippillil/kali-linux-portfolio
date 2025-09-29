import { typeRamp, typeRampVars } from './type-scale';

export type TypeRampToken = keyof typeof typeRamp;

export const typeClassName = (token: TypeRampToken): string => `text-ramp-${token}`;

export const typography = {
  caption: typeClassName('xs'),
  label: typeClassName('2xs'),
  labelTight: typeClassName('xs'),
  bodySm: typeClassName('sm'),
  body: typeClassName('md'),
  bodyStrong: `${typeClassName('md')} font-medium`,
  bodyBold: `${typeClassName('md')} font-semibold`,
  bodyLg: typeClassName('lg'),
  titleSm: `${typeClassName('lg')} font-semibold`,
  title: `${typeClassName('xl')} font-semibold`,
  titleLg: `${typeClassName('2xl')} font-semibold`,
  display: `${typeClassName('3xl')} font-bold`,
};

export const typographyMono = {
  xs: `${typeClassName('2xs')} font-mono`,
  sm: `${typeClassName('xs')} font-mono`,
  body: `${typeClassName('sm')} font-mono`,
};

export const typeRampVariables = typeRampVars;

export { typeRamp };
