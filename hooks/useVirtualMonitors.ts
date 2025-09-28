import { useEffect, useState } from 'react';
import { computeMonitorLayout, DEFAULT_MONITOR_LAYOUT } from '../utils/monitorLayouts';

type Monitor = {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const getViewportDimensions = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

export function useVirtualMonitors(layout: string | null | undefined) {
  const [monitors, setMonitors] = useState<Monitor[]>(() => {
    const { width, height } = getViewportDimensions();
    return computeMonitorLayout(layout || DEFAULT_MONITOR_LAYOUT, width, height);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const { width, height } = getViewportDimensions();
      setMonitors(computeMonitorLayout(layout || DEFAULT_MONITOR_LAYOUT, width, height));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [layout]);

  return monitors;
}
