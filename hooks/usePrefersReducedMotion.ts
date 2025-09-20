import useReducedMotion from './useReducedMotion';

export default function usePrefersReducedMotion() {
  return useReducedMotion().reducedMotion;
}
