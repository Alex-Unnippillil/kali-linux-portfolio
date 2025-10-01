'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import useNormalizedScroll from '../../utils/scroll';

type AppShellProps = React.HTMLAttributes<HTMLDivElement>;

const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  ({ className, children, ...props }, forwardedRef) => {
    const { reducedMotion } = useSettings();
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
      if (typeof window === 'undefined' || !('matchMedia' in window)) {
        setPrefersReducedMotion(false);
        return undefined;
      }

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

      updatePreference();
      if ('addEventListener' in mediaQuery) {
        mediaQuery.addEventListener('change', updatePreference);
      } else if ('addListener' in mediaQuery) {
        // @ts-expect-error Legacy Safari support
        mediaQuery.addListener(updatePreference);
      }

      return () => {
        if ('removeEventListener' in mediaQuery) {
          mediaQuery.removeEventListener('change', updatePreference);
        } else if ('removeListener' in mediaQuery) {
          // @ts-expect-error Legacy Safari support
          mediaQuery.removeListener(updatePreference);
        }
      };
    }, []);

    const effectiveReducedMotion = reducedMotion || prefersReducedMotion;

    const scrollRef = useNormalizedScroll<HTMLDivElement>({
      axis: 'both',
      overscrollCushion: 0.22,
      reduceMotion: effectiveReducedMotion,
    });

    useEffect(() => {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      if (effectiveReducedMotion) {
        root.style.setProperty('--app-scroll-behavior', 'auto');
        root.classList.add('app-scroll-reduced');
      } else {
        root.style.setProperty('--app-scroll-behavior', 'smooth');
        root.classList.remove('app-scroll-reduced');
      }
    }, [effectiveReducedMotion]);

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        scrollRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [forwardedRef, scrollRef],
    );

    const classes = useMemo(
      () =>
        clsx(
          'app-shell relative flex min-h-screen w-full flex-col overflow-hidden bg-transparent text-white antialiased',
          className,
        ),
      [className],
    );

    return (
      <div ref={setRef} data-normalized-scroll {...props} className={classes}>
        {children}
      </div>
    );
  },
);

AppShell.displayName = 'AppShell';

export default AppShell;
