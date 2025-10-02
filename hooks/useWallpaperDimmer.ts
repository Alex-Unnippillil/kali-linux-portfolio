import { useCallback, useEffect, useRef } from 'react';

const WALLPAPER_DIM_CLASS = 'wallpaper-dimmed';
let activeDimRequests = 0;

const getRootElement = () =>
  typeof document === 'undefined' ? null : document.documentElement;

const applyDimClass = () => {
  const root = getRootElement();
  if (!root) return;
  root.classList.add(WALLPAPER_DIM_CLASS);
};

const removeDimClass = () => {
  const root = getRootElement();
  if (!root) return;
  root.classList.remove(WALLPAPER_DIM_CLASS);
};

export function useWallpaperDimmer() {
  const hasActiveRequest = useRef(false);

  const dimWallpaper = useCallback(() => {
    if (hasActiveRequest.current) return;
    const root = getRootElement();
    if (!root) return;

    hasActiveRequest.current = true;
    activeDimRequests += 1;
    if (activeDimRequests === 1) {
      applyDimClass();
    }
  }, []);

  const restoreWallpaper = useCallback(() => {
    if (!hasActiveRequest.current) return;
    if (activeDimRequests === 0) {
      hasActiveRequest.current = false;
      return;
    }

    hasActiveRequest.current = false;
    activeDimRequests = Math.max(0, activeDimRequests - 1);
    if (activeDimRequests === 0) {
      removeDimClass();
    }
  }, []);

  useEffect(() => () => {
    if (!hasActiveRequest.current) return;
    hasActiveRequest.current = false;
    activeDimRequests = Math.max(0, activeDimRequests - 1);
    if (activeDimRequests === 0) {
      removeDimClass();
    }
  }, []);

  return {
    dimWallpaper,
    restoreWallpaper,
  };
}

export default useWallpaperDimmer;
