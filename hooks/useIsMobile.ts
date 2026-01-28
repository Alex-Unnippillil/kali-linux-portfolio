import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 768px), (pointer: coarse)';

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const updateMatch = () => setIsMobile(mediaQuery.matches);
    updateMatch();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMatch);
      return () => mediaQuery.removeEventListener('change', updateMatch);
    }

    // eslint-disable-next-line deprecation/deprecation
    mediaQuery.addListener(updateMatch);
    // eslint-disable-next-line deprecation/deprecation
    return () => mediaQuery.removeListener(updateMatch);
  }, []);

  return isMobile;
}
