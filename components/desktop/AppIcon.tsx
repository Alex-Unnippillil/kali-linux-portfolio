import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

type PrefetchHandler = () => Promise<void> | void;

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

export interface AppIconProps {
  id: string;
  name: string;
  icon: string;
  displayName?: React.ReactNode;
  disabled?: boolean;
  onOpen: (id: string) => void;
  prefetch?: PrefetchHandler;
  href?: string;
  isLoaded?: boolean;
}

const HOVER_PREFETCH_DELAY = 100;

const isSlowConnection = (connection?: NetworkInformationLike) => {
  if (!connection) return false;
  if (connection.saveData) return true;
  const type = connection.effectiveType;
  if (!type) return false;
  return type.includes('2g') || type === 'slow-2g';
};

const AppIcon: React.FC<AppIconProps> = ({
  id,
  name,
  icon,
  displayName,
  disabled = false,
  onOpen,
  prefetch,
  href,
  isLoaded = false,
}) => {
  const [launching, setLaunching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const launchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedRef = useRef(false);
  const routePrefetchedRef = useRef(false);
  const router = useRouter();

  const cancelDwell = useCallback(() => {
    if (dwellTimerRef.current !== null) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      prefetchedRef.current = true;
      routePrefetchedRef.current = true;
      cancelDwell();
    }
  }, [isLoaded, cancelDwell]);

  useEffect(
    () => () => {
      cancelDwell();
      if (launchTimerRef.current) {
        clearTimeout(launchTimerRef.current);
      }
    },
    [cancelDwell],
  );

  const maybePrefetch = useCallback(() => {
    if (prefetchedRef.current || disabled || isLoaded) {
      return;
    }

    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    if (navigator.onLine === false) {
      return;
    }

    if (typeof window.matchMedia === 'function') {
      try {
        if (window.matchMedia('(prefers-reduced-data: reduce)').matches) {
          return;
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to evaluate prefers-reduced-data media query', error);
        }
      }
    }

    const nav = navigator as NavigatorWithConnection;
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection || undefined;

    if (isSlowConnection(connection)) {
      return;
    }

    prefetchedRef.current = true;
    cancelDwell();

    if (href && !routePrefetchedRef.current && typeof router.prefetch === 'function') {
      routePrefetchedRef.current = true;
      void router.prefetch(href).catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Failed to prefetch route "${href}"`, error);
        }
      });
    }

    if (prefetch) {
      try {
        const result = prefetch();
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          void (result as Promise<unknown>).catch((error) => {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`Failed to preload app "${id}"`, error);
            }
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Failed to preload app "${id}"`, error);
        }
      }
    }
  }, [cancelDwell, disabled, href, id, isLoaded, prefetch, router]);

  const schedulePrefetch = useCallback(() => {
    if (disabled || prefetchedRef.current || isLoaded) {
      return;
    }
    if (dwellTimerRef.current !== null) {
      return;
    }
    dwellTimerRef.current = setTimeout(() => {
      dwellTimerRef.current = null;
      maybePrefetch();
    }, HOVER_PREFETCH_DELAY);
  }, [disabled, isLoaded, maybePrefetch]);

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    schedulePrefetch();
  };

  const handlePointerLeave = () => {
    cancelDwell();
  };

  const handleFocus = () => {
    schedulePrefetch();
  };

  const handleBlur = () => {
    cancelDwell();
  };

  const triggerOpen = useCallback(() => {
    if (disabled) return;
    cancelDwell();
    prefetchedRef.current = true;
    setLaunching(true);
    if (launchTimerRef.current) {
      clearTimeout(launchTimerRef.current);
    }
    launchTimerRef.current = setTimeout(() => {
      setLaunching(false);
    }, 300);
    onOpen(id);
  }, [cancelDwell, disabled, id, onOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      triggerOpen();
    }
  };

  const className = `${launching ? 'app-icon-launch ' : ''}${
    dragging ? 'opacity-70 ' : ''
  }${disabled ? 'pointer-events-none opacity-50 ' : ''}p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active`;

  return (
    <div
      role="button"
      aria-label={name}
      aria-disabled={disabled}
      data-context="app"
      data-app-id={id}
      draggable
      tabIndex={disabled ? -1 : 0}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onDoubleClick={triggerOpen}
      onKeyDown={handleKeyDown}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className={className}
      id={`app-${id}`}
    >
      <Image
        width={40}
        height={40}
        className="mb-1 w-10"
        src={icon.replace('./', '/')}
        alt={`Kali ${name}`}
        sizes="40px"
      />
      {displayName || name}
    </div>
  );
};

export default AppIcon;
