export const isBrowser =
  typeof globalThis !== 'undefined' &&
  typeof globalThis['window'] !== 'undefined' &&
  typeof globalThis['document'] !== 'undefined' &&
  typeof globalThis['navigator'] !== 'undefined';

export default isBrowser;
