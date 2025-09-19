import { useEffect, useState } from 'react';
import { selectReducedMotion, useSettingsSelector } from './useSettings';

export default function usePrefersReducedMotion() {
  const reducedMotion = useSettingsSelector(selectReducedMotion);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reducedMotion || prefersReduced;
}
