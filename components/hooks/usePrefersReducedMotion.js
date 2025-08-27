import { useEffect, useState } from 'react';

// Hook to respect the user's reduced motion preference
export default function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setPrefersReduced(
        media.matches || document.documentElement.classList.contains('reduced-motion'),
      );
    };
    update();
    media.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return prefersReduced;
}
