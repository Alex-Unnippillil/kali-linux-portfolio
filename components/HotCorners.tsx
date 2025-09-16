"use client";

import { useCallback, useEffect, useRef } from 'react';

const CORNER_SIZE = 32;

const HotCorners = () => {
  const hotCornerActiveRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const alreadyActive = root.classList.contains('show-overview');
    root.classList.add('show-overview');
    hotCornerActiveRef.current = !alreadyActive;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (typeof document === 'undefined') {
      hotCornerActiveRef.current = false;
      return;
    }

    const root = document.documentElement;
    if (hotCornerActiveRef.current) {
      root.classList.remove('show-overview');
    }
    hotCornerActiveRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (typeof document === 'undefined') {
        return;
      }

      if (hotCornerActiveRef.current) {
        document.documentElement.classList.remove('show-overview');
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 top-0 z-50 opacity-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ height: CORNER_SIZE, width: CORNER_SIZE }}
    />
  );
};

export default HotCorners;
