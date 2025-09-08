import { useEffect, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

export default function useScreenReader() {
  const reducedMotion = usePrefersReducedMotion();
  const [forcedColors, setForcedColors] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(forced-colors: active)');
    const update = () => setForcedColors(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reducedMotion || forcedColors;
}
