import { useEffect, RefObject } from "react";

export default function useWakeLockOnFullscreen(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    let lock: any;

    const requestLock = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request?.("screen");
      } catch {
        lock = null;
      }
    };

    const releaseLock = async () => {
      try {
        await lock?.release?.();
      } catch {}
      lock = null;
    };

    const handleChange = () => {
      const el = ref.current;
      const fsEl = document.fullscreenElement;
      if (el && fsEl && (el === fsEl || el.contains(fsEl))) {
        requestLock();
      } else {
        releaseLock();
      }
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      releaseLock();
    };
  }, [ref]);
}

