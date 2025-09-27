const clampValue = (min, preferred, max) => `clamp(${min}, ${preferred}, ${max})`;

const typographyScale = Object.freeze({
  body: Object.freeze({
    xs: clampValue('0.8125rem', '0.78rem + 0.2vw', '0.9375rem'),
    sm: clampValue('0.875rem', '0.84rem + 0.22vw', '1rem'),
    md: clampValue('1rem', '0.96rem + 0.25vw', '1.125rem'),
    lg: clampValue('1.125rem', '1.07rem + 0.32vw', '1.25rem'),
  }),
  heading: Object.freeze({
    xs: clampValue('1.25rem', '1.17rem + 0.35vw', '1.5rem'),
    sm: clampValue('1.5rem', '1.4rem + 0.45vw', '1.8rem'),
    md: clampValue('1.875rem', '1.72rem + 0.6vw', '2.25rem'),
    lg: clampValue('2.25rem', '2.05rem + 0.75vw', '2.75rem'),
  }),
  display: Object.freeze({
    sm: clampValue('2.75rem', '2.45rem + 1vw', '3.5rem'),
    md: clampValue('3.25rem', '2.85rem + 1.2vw', '4rem'),
    lg: clampValue('3.75rem', '3.25rem + 1.4vw', '4.5rem'),
  }),
  mono: Object.freeze({
    sm: clampValue('0.8125rem', '0.79rem + 0.15vw', '0.9375rem'),
    md: clampValue('0.9375rem', '0.9rem + 0.18vw', '1.0625rem'),
    lg: clampValue('1.0625rem', '1.02rem + 0.22vw', '1.1875rem'),
  }),
});

const lineHeights = Object.freeze({
  tight: 1.15,
  snug: 1.25,
  standard: 1.5,
  relaxed: 1.7,
  mono: 1.45,
});

const typeSpacing = Object.freeze({
  stackSm: clampValue('0.5rem', '0.45rem + 0.2vw', '0.75rem'),
  stackMd: clampValue('0.75rem', '0.6rem + 0.3vw', '1.25rem'),
  stackLg: clampValue('1.25rem', '1rem + 0.4vw', '1.75rem'),
});

module.exports = {
  clampValue,
  typographyScale,
  lineHeights,
  typeSpacing,
};
