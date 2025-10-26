"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const ANIMATION_DURATION = 350;

export function RouteProgress() {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const previousPath = previousPathRef.current;
    const isInitialLoad = previousPath === null;

    if (previousPath === pathname) {
      return;
    }

    previousPathRef.current = pathname;

    if (isInitialLoad) {
      return;
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setAnimationKey((value) => value + 1);
    setIsAnimating(true);

    const timeoutId = setTimeout(() => {
      setIsAnimating(false);
      timerRef.current = null;
    }, ANIMATION_DURATION);

    timerRef.current = timeoutId;

    return () => {
      clearTimeout(timeoutId);
      timerRef.current = null;
    };
  }, [pathname]);

  useEffect(() => () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  if (!isAnimating) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5">
        <span
          key={animationKey}
          className="block h-full w-full origin-left bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500"
          style={{
            animationDuration: `${ANIMATION_DURATION}ms`,
            animationFillMode: "forwards",
            animationTimingFunction: "ease-out",
            animationName: "route-progress-bar",
            transform: "scaleX(0)",
            willChange: "transform",
          }}
        />
      </div>
      <style jsx global>{`
        @keyframes route-progress-bar {
          from {
            transform: scaleX(0);
            opacity: 0.7;
          }
          to {
            transform: scaleX(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

export default RouteProgress;
