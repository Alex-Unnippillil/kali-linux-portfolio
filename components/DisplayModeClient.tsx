"use client";

import { useEffect } from 'react';

const DISPLAY_MODE_QUERY = '(display-mode: standalone)';

const DisplayModeClient: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(DISPLAY_MODE_QUERY);
    const root = document.documentElement;

    const applyMatches = (matches: boolean) => {
      if (matches) {
        root.classList.add('installed');
      } else {
        root.classList.remove('installed');
      }
    };

    const handleChange = (event: MediaQueryListEvent) => {
      applyMatches(event.matches);
    };

    applyMatches(mediaQueryList.matches);

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', handleChange);
      return () => {
        mediaQueryList.removeEventListener('change', handleChange);
        root.classList.remove('installed');
      };
    }

    if (typeof mediaQueryList.addListener === 'function') {
      const legacyHandler: MediaQueryListListener = function (event) {
        applyMatches(event.matches);
      };
      mediaQueryList.addListener(legacyHandler);
      return () => {
        mediaQueryList.removeListener(legacyHandler);
        root.classList.remove('installed');
      };
    }

    return () => {
      root.classList.remove('installed');
    };
  }, []);

  return null;
};

export default DisplayModeClient;
