import React, { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'warning-banner-dismissed';

interface WarningBannerProps {
  children: React.ReactNode;
}

export default function WarningBanner({ children }: WarningBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [maxHeight, setMaxHeight] = useState('0px');
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const dismissed = window.localStorage.getItem(STORAGE_KEY) === 'true';

    if (!dismissed) {
      setShouldRender(true);
      setIsVisible(true);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    const measureHeight = () => {
      if (containerRef.current) {
        setMaxHeight(`${containerRef.current.scrollHeight}px`);
      }
    };

    measureHeight();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', measureHeight);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', measureHeight);
      }
    };
  }, [shouldRender, children]);

  useEffect(() => {
    if (!isVisible && shouldRender) {
      hideTimerRef.current = setTimeout(() => {
        setShouldRender(false);
      }, 320);
    }
  }, [isVisible, shouldRender]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
  }, []);

  if (!shouldRender && !isVisible) {
    return null;
  }

  const statusProps = isVisible
    ? {
        role: 'status' as const,
        'aria-live': 'polite' as const,
        'aria-atomic': 'true' as const,
      }
    : {};

  return (
    <div
      className="transition-[max-height] duration-300 ease-in-out"
      style={{ maxHeight: isVisible ? maxHeight : '0px', overflow: 'hidden' }}
      aria-hidden={!isVisible}
    >
      <div
        ref={containerRef}
        className={`flex items-start justify-between rounded-md bg-amber-100 p-3 text-amber-900 shadow-sm transition-opacity duration-300 ease-in-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        {...statusProps}
      >
        <span className="mr-2 mt-0.5" role="img" aria-label="warning">
          ⚠️
        </span>
        <span className="flex-1 text-sm leading-5">{children}</span>
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-amber-900 transition-colors hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          aria-label="Dismiss warning"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
