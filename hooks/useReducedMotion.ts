import usePrefersReducedMotion from './usePrefersReducedMotion';
import { useSettings } from './useSettings';

export default function useReducedMotion() {
  const prefers = usePrefersReducedMotion();
  const { reducedMotion } = useSettings();
  return reducedMotion || prefers;
}
