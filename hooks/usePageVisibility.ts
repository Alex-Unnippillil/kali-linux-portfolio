import { useState, useEffect } from 'react';

/**
 * React hook that returns whether the page is currently visible.
 * Listens to the `visibilitychange` event and updates the state.
 */
export default function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden
  );

  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return isVisible;
}
