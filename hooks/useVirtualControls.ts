import { useState, useRef, useEffect } from 'react';

/**
 * Handles visibility of virtual controls with auto-hide timeout.
 */
export function useVirtualControls(timeout = 3000) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), timeout);
  };

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { visible, show, hide } as const;
}

export default useVirtualControls;
