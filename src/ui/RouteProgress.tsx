'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const HIDE_DELAY_MS = 300;
const BAR_CLASSNAMES =
  'pointer-events-none fixed inset-x-0 top-0 z-[1000] h-[2px] bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 transition-opacity duration-200';

const RouteProgress = () => {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);

    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      timeoutRef.current = null;
    }, HIDE_DELAY_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pathname]);

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`${BAR_CLASSNAMES} ${loading ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

export default RouteProgress;
