"use client";

import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';

const MOBILE_QUERY = '(max-width: 479px)';

interface MobileBackButtonProps {
  appId: string;
  onBack?: () => void;
  className?: string;
}

const isFocusableElement = (element: Element | null): boolean => {
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
};

const MobileBackButton: React.FC<MobileBackButtonProps> = ({
  appId,
  onBack,
  className,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setIsMobile(window.innerWidth <= 479);
    };

    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia(MOBILE_QUERY);
      const updateFromQuery = (event?: MediaQueryListEvent) => {
        setIsMobile((event ?? query).matches);
      };
      updateFromQuery();
      const listener = (event: MediaQueryListEvent) => updateFromQuery(event);
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', listener);
        return () => query.removeEventListener('change', listener);
      }
      if (typeof query.addListener === 'function') {
        query.addListener(listener);
        return () => query.removeListener(listener);
      }
      // Fallback if neither modern nor legacy listeners exist
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleBack = useCallback(() => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (typeof document !== 'undefined') {
      const closeButton = document.getElementById(`close-${appId}`) as
        | HTMLButtonElement
        | HTMLDivElement
        | null;
      if (closeButton && typeof closeButton.click === 'function') {
        closeButton.click();
        return;
      }
    }
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/apps';
      }
    }
  }, [appId, onBack]);

  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey || event.key !== 'ArrowLeft') return;
      const target = event.target as Element | null;
      if (isFocusableElement(target)) return;
      event.preventDefault();
      handleBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobile, handleBack]);

  return (
    <button
      type="button"
      onClick={handleBack}
      className={clsx(
        'group hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white shadow-lg backdrop-blur transition hover:bg-slate-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 max-[479px]:inline-flex',
        className,
      )}
      aria-label="Go back"
      title="Go back"
      data-testid="mobile-back-button"
      data-mobile-active={isMobile ? 'true' : 'false'}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-white/90 transition group-hover:text-white"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 6L9 12L15 18" />
      </svg>
      <span className="sr-only">Go back</span>
    </button>
  );
};

export default MobileBackButton;
