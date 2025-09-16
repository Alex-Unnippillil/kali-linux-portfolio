'use client';

import Image from 'next/image';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const AUTO_HIDE_DELAY = 2000;
const EDGE_THRESHOLD = 8;

type BatteryManager = {
  level: number;
  charging: boolean;
  addEventListener: (type: 'levelchange' | 'chargingchange', listener: () => void) => void;
  removeEventListener: (type: 'levelchange' | 'chargingchange', listener: () => void) => void;
};

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManager>;
};

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);

export default function FullscreenBar() {
  const [visible, setVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [battery, setBattery] = useState<{ level: number | null; charging: boolean | null }>({
    level: null,
    charging: null,
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const hideTimerRef = useRef<number | null>(null);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const startHideTimer = useCallback(() => {
    if (!isFullscreen) return;
    if (pointerInsideRef.current || focusInsideRef.current) return;
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      if (!pointerInsideRef.current && !focusInsideRef.current) {
        setVisible(false);
      }
    }, AUTO_HIDE_DELAY);
  }, [clearHideTimer, isFullscreen]);

  const showBar = useCallback(() => {
    if (!isFullscreen) return;
    clearHideTimer();
    setVisible(true);
    startHideTimer();
  }, [clearHideTimer, isFullscreen, startHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const updateFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    updateFullscreen();
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      pointerInsideRef.current = false;
      focusInsideRef.current = false;
      clearHideTimer();
      setVisible(false);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerType === '') {
        if (event.clientY <= EDGE_THRESHOLD) {
          showBar();
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [clearHideTimer, isFullscreen, showBar]);

  useEffect(() => {
    const updateTime = () => {
      setNow(new Date());
    };

    updateTime();
    const interval = window.setInterval(updateTime, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return;

    let isMounted = true;
    let batteryManager: BatteryManager | null = null;
    let handleBatteryChange: (() => void) | null = null;

    nav
      .getBattery()
      .then((manager) => {
        if (!isMounted) return;
        batteryManager = manager;
        handleBatteryChange = () => {
          setBattery({
            level: manager.level,
            charging: manager.charging,
          });
        };
        handleBatteryChange();
        manager.addEventListener('levelchange', handleBatteryChange);
        manager.addEventListener('chargingchange', handleBatteryChange);
      })
      .catch(() => {
        if (isMounted) {
          setBattery({ level: null, charging: null });
        }
      });

    return () => {
      isMounted = false;
      if (batteryManager && handleBatteryChange) {
        batteryManager.removeEventListener('levelchange', handleBatteryChange);
        batteryManager.removeEventListener('chargingchange', handleBatteryChange);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  const handlePointerEnter = useCallback(() => {
    pointerInsideRef.current = true;
    clearHideTimer();
    if (isFullscreen) {
      setVisible(true);
    }
  }, [clearHideTimer, isFullscreen]);

  const handlePointerLeave = useCallback(() => {
    pointerInsideRef.current = false;
    startHideTimer();
  }, [startHideTimer]);

  const handleFocusCapture = useCallback(() => {
    focusInsideRef.current = true;
    clearHideTimer();
    if (isFullscreen) {
      setVisible(true);
    }
  }, [clearHideTimer, isFullscreen]);

  const handleBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    focusInsideRef.current = false;
    startHideTimer();
  }, [startHideTimer]);

  const handleExitFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  const formattedTime = useMemo(() => formatTime(now), [now]);
  const isoTime = useMemo(() => now.toISOString(), [now]);
  const batteryPercentage = battery.level !== null ? Math.round(battery.level * 100) : null;
  const batteryText = batteryPercentage !== null ? `${batteryPercentage}%` : 'Battery';
  const batteryTitle = batteryPercentage !== null
    ? `${batteryPercentage}% ${battery.charging ? 'charging' : 'remaining'}`
    : 'Battery status unavailable';

  if (!isFullscreen && !visible) {
    return null;
  }

  const animationClasses = prefersReducedMotion
    ? ''
    : 'transition-transform transition-opacity duration-200 ease-out';

  return (
    <div className="pointer-events-none fixed top-0 left-1/2 z-[120] w-full max-w-4xl -translate-x-1/2 px-2 sm:px-4">
      <div
        role="toolbar"
        aria-label="Fullscreen status bar"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
        className={`pointer-events-auto mt-2 flex items-center justify-between gap-4 rounded-b-md bg-ub-cool-grey bg-opacity-95 px-3 py-2 text-xs text-white shadow-lg backdrop-blur transform ${animationClasses} ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
      >
        <div className="flex items-center gap-3">
          <time dateTime={isoTime} className="font-medium" aria-label={`Current time ${formattedTime}`}>
            {formattedTime}
          </time>
          <span
            className="flex items-center gap-1"
            title={batteryTitle}
            aria-label={batteryTitle}
          >
            <Image
              src="/themes/Yaru/status/battery-good-symbolic.svg"
              alt="Battery status icon"
              width={16}
              height={16}
              className="h-4 w-4"
            />
            <span aria-live="polite">{batteryText}{battery.charging ? ' ⚡' : ''}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleExitFullscreen}
          className="flex items-center gap-2 rounded bg-white bg-opacity-10 px-3 py-1 text-xs font-medium text-white outline-none transition focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ub-cool-grey hover:bg-opacity-20"
        >
          <Image
            src="/themes/Yaru/window/window-restore-symbolic.svg"
            alt="Exit fullscreen"
            width={16}
            height={16}
            className="h-4 w-4"
          />
          <span className="whitespace-nowrap">Exit Fullscreen</span>
        </button>
      </div>
    </div>
  );
}
