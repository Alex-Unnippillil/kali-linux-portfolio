'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NAVBAR_AUTOHIDE_EVENT } from '../utils/desktopEvents';
import { useSettings } from './useSettings';

type NavbarAutohideDetail = {
  id?: string;
  hidden?: boolean;
};

export function useNavbarAutohide() {
  const { autohideNavbar } = useSettings();
  const [hidden, setHidden] = useState(false);
  const hiddenMapRef = useRef(new Map<string, boolean>());
  const fullscreenRef = useRef(false);

  const recompute = useCallback(() => {
    if (!autohideNavbar) {
      setHidden(false);
      return;
    }
    const windowHidden = Array.from(hiddenMapRef.current.values()).some(Boolean);
    setHidden(windowHidden || fullscreenRef.current);
  }, [autohideNavbar]);

  useEffect(() => {
    const handleChange: EventListener = (event) => {
      const { detail } = event as CustomEvent<NavbarAutohideDetail>;
      if (!detail || !detail.id) return;
      if (detail.hidden) {
        hiddenMapRef.current.set(detail.id, true);
      } else {
        hiddenMapRef.current.delete(detail.id);
      }
      recompute();
    };

    const handleFullscreen = () => {
      fullscreenRef.current = typeof document !== 'undefined' && !!document.fullscreenElement;
      recompute();
    };

    window.addEventListener(NAVBAR_AUTOHIDE_EVENT, handleChange);
    document.addEventListener('fullscreenchange', handleFullscreen);

    handleFullscreen();

    return () => {
      window.removeEventListener(NAVBAR_AUTOHIDE_EVENT, handleChange);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [recompute]);

  useEffect(() => {
    recompute();
  }, [autohideNavbar, recompute]);

  return { hidden };
}
