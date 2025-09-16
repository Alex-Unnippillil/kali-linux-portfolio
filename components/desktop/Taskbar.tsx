"use client";

import Image from 'next/image';
import {
  FocusEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { useSettings } from '../../hooks/useSettings';

type DesktopApp = {
  id: string;
  title: string;
  icon: string;
};

type WindowState = Record<string, boolean | undefined>;

interface TaskbarProps {
  apps: DesktopApp[];
  closed_windows: WindowState;
  minimized_windows: WindowState;
  focused_windows: WindowState;
  openApp: (id: string) => void;
  minimize: (id: string) => void;
}

const IDLE_HIDE_DELAY = 1200;

const Taskbar = ({
  apps,
  closed_windows,
  minimized_windows,
  focused_windows,
  openApp,
  minimize,
}: TaskbarProps) => {
  const runningApps = useMemo(
    () => apps.filter((app) => closed_windows?.[app.id] === false),
    [apps, closed_windows],
  );
  const { taskbarAutoHide } = useSettings();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);

  const shouldHoldOpen = useCallback(
    () => pointerInsideRef.current || focusInsideRef.current,
    [],
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    if (!taskbarAutoHide || shouldHoldOpen()) {
      return;
    }
    hideTimerRef.current = window.setTimeout(() => {
      if (!shouldHoldOpen()) {
        setVisible(false);
      }
      hideTimerRef.current = null;
    }, IDLE_HIDE_DELAY);
  }, [clearHideTimer, shouldHoldOpen, taskbarAutoHide]);

  const reveal = useCallback(() => {
    setVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    pointerInsideRef.current = false;
    focusInsideRef.current = false;
    setVisible(true);
    scheduleHide();
    return () => clearHideTimer();
  }, [taskbarAutoHide, scheduleHide, clearHideTimer]);

  useEffect(() => {
    if (!taskbarAutoHide) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta' || event.key === 'OS') {
        reveal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [taskbarAutoHide, reveal]);

  const handleZoneEnter = useCallback(() => {
    pointerInsideRef.current = true;
    reveal();
  }, [reveal]);

  const handleZoneLeave = useCallback(() => {
    pointerInsideRef.current = false;
    scheduleHide();
  }, [scheduleHide]);

  const handleBarEnter = useCallback(() => {
    pointerInsideRef.current = true;
    reveal();
  }, [reveal]);

  const handleBarLeave = useCallback(() => {
    pointerInsideRef.current = false;
    scheduleHide();
  }, [scheduleHide]);

  const handleFocusCapture = useCallback(() => {
    focusInsideRef.current = true;
    reveal();
  }, [reveal]);

  const handleBlurCapture = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && event.currentTarget.contains(nextTarget)) {
        return;
      }
      focusInsideRef.current = false;
      scheduleHide();
    },
    [scheduleHide],
  );

  const barTransition = prefersReducedMotion
    ? 'transition-none'
    : 'transition-transform transition-opacity duration-150 ease-out';

  const barVisibility = visible
    ? 'translate-y-0 opacity-100 pointer-events-auto'
    : 'translate-y-full opacity-0 pointer-events-none';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      <div
        aria-hidden
        className={`absolute bottom-0 left-0 right-0 h-2 ${
          taskbarAutoHide && !visible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        onPointerEnter={handleZoneEnter}
        onPointerLeave={handleZoneLeave}
        onTouchStart={handleZoneEnter}
        onTouchEnd={handleZoneLeave}
      />
      <div
        role="toolbar"
        className={`relative flex h-10 w-full transform-gpu items-center bg-black bg-opacity-50 ${barTransition} ${barVisibility}`}
        onPointerEnter={handleBarEnter}
        onPointerLeave={handleBarLeave}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        {runningApps.map((app) => {
          const isMinimized = minimized_windows?.[app.id];
          const isFocused = focused_windows?.[app.id] && !isMinimized;
          return (
            <button
              key={app.id}
              type="button"
              aria-label={app.title}
              data-context="taskbar"
              data-app-id={app.id}
              onClick={() => {
                if (isMinimized) {
                  openApp(app.id);
                } else if (isFocused) {
                  minimize(app.id);
                } else {
                  openApp(app.id);
                }
              }}
              className={`${
                isFocused && !isMinimized ? 'bg-white bg-opacity-20 ' : ''
              }relative mx-1 flex items-center rounded px-2 py-1 hover:bg-white hover:bg-opacity-10`}
            >
              <Image
                width={24}
                height={24}
                className="h-5 w-5"
                src={app.icon.replace('./', '/')}
                alt=""
                sizes="24px"
              />
              <span className="ml-1 whitespace-nowrap text-sm text-white">{app.title}</span>
              {!isFocused && !isMinimized && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-2 -translate-x-1/2 rounded bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Taskbar;
