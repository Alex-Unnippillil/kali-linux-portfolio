const typeRamp = {
  '2xs': {
    fontSize: 'clamp(0.625rem, 0.58rem + 0.2vw, 0.72rem)',
    lineHeight: '1.35',
  },
  xs: {
    fontSize: 'clamp(0.7rem, 0.66rem + 0.22vw, 0.82rem)',
    lineHeight: '1.4',
  },
  sm: {
    fontSize: 'clamp(0.82rem, 0.78rem + 0.26vw, 0.94rem)',
    lineHeight: '1.45',
  },
  md: {
    fontSize: 'clamp(0.95rem, 0.9rem + 0.32vw, 1.08rem)',
    lineHeight: '1.5',
  },
  lg: {
    fontSize: 'clamp(1.12rem, 1.04rem + 0.42vw, 1.35rem)',
    lineHeight: '1.45',
  },
  xl: {
    fontSize: 'clamp(1.35rem, 1.24rem + 0.6vw, 1.75rem)',
    lineHeight: '1.35',
  },
  '2xl': {
    fontSize: 'clamp(1.7rem, 1.5rem + 0.75vw, 2.25rem)',
    lineHeight: '1.25',
  },
  '3xl': {
    fontSize: 'clamp(2.1rem, 1.82rem + 0.95vw, 2.8rem)',
    lineHeight: '1.2',
  },
};

const typeRampVars = Object.fromEntries(
  Object.entries(typeRamp).flatMap(([token, values]) => [
    [`--font-size-${token}`, values.fontSize],
    [`--line-height-${token}`, values.lineHeight],
  ]),
);

module.exports = { typeRamp, typeRampVars };
