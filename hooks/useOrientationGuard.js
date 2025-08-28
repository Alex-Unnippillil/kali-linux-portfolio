"use client";

import { useState, useEffect } from 'react';

// Tracks the device orientation. Useful for games that require landscape mode.
export default function useOrientationGuard() {
  const getOrientation = () =>
    (typeof window !== 'undefined' && window.screen?.orientation?.type) || 'landscape-primary';

  const [orientation, setOrientation] = useState(getOrientation);

  useEffect(() => {
    const handle = () => setOrientation(getOrientation());
    window.addEventListener('orientationchange', handle);
    return () => window.removeEventListener('orientationchange', handle);
  }, []);

  return orientation;
}
