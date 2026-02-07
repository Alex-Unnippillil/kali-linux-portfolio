"use client";

import { useEffect, useRef } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import { useSettings } from "../../hooks/useSettings";

/**
 * Manage cycling through selected wallpapers.
 * Reads selected wallpapers, interval and play state from persistent storage
 * and uses the Visibility API to pause the slideshow when the tab is hidden.
 */
export default function WallpaperManager() {
  const { setWallpaper } = useSettings();
  const [selected] = usePersistentState<string[]>("bg-slideshow-selected", []);
  const [intervalMs] = usePersistentState<number>(
    "bg-slideshow-interval",
    30000,
  );
  const [playing] = usePersistentState<boolean>("bg-slideshow-playing", false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const run = () => {
      const file = selected[indexRef.current % selected.length];
      const base = file.replace(/\.[^.]+$/, "");
      setWallpaper(base);
      indexRef.current = (indexRef.current + 1) % selected.length;
    };

    const start = () => {
      if (!playing || selected.length === 0) return;
      run();
      timerRef.current = setInterval(run, intervalMs);
    };

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [playing, intervalMs, selected, setWallpaper]);

  return null;
}

