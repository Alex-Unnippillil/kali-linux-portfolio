import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  FocusEvent,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const HOVER_PREFETCH_DELAY_MS = 100;
const PREFETCH_DATA_ATTR = 'data-app-icon-prefetch';

const prefetchedAssetUrls = new Set<string>();
const prefetchedRouteAssets = new Set<string>();

const isPromiseLike = (value: unknown): value is Promise<unknown> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as Promise<unknown>).then === 'function'
  );
};

const normalizeAssetPrefix = (assetPrefix: string | undefined): string => {
  if (!assetPrefix) {
    return '';
  }
  return assetPrefix.replace(/\/+$/, '');
};

const toAbsoluteAssetUrl = (chunk: string, assetPrefix: string): string | null => {
  if (!chunk) {
    return null;
  }

  if (/^(?:https?:)?\/\//.test(chunk)) {
    return chunk;
  }

  let path = chunk.startsWith('/') ? chunk : `/${chunk}`;
  if (!path.startsWith('/_next/')) {
    path = `/_next${path.startsWith('/_next') ? path.slice('/_next'.length) : path}`;
  }

  const prefix = normalizeAssetPrefix(assetPrefix);
  if (!prefix) {
    return path;
  }

  const url = `${prefix}${path}`;
  return url.replace(/([^:])\/+/g, '$1/');
};

const resolveManifest = (
  manifest: unknown,
): Record<string, string[]> | undefined => {
  if (!manifest) {
    return undefined;
  }
  if (typeof manifest === 'function') {
    try {
      return manifest();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('Failed to read build manifest function', error);
      }
      return undefined;
    }
  }
  if (typeof manifest === 'object') {
    return manifest as Record<string, string[]>;
  }
  return undefined;
};

const ensurePrefetchLink = (url: string, as: 'script' | 'style') => {
  const key = `${as}:${url}`;
  if (prefetchedAssetUrls.has(key)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = as;
  link.href = url;
  link.crossOrigin = 'anonymous';
  link.setAttribute(PREFETCH_DATA_ATTR, 'true');
  document.head.appendChild(link);
  prefetchedAssetUrls.add(key);
};

const prefetchRouteChunks = (route: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (prefetchedRouteAssets.has(route)) {
    return;
  }

  const win = window as typeof window & {
    __BUILD_MANIFEST?: unknown;
    __BUILD_MANIFEST_CSS?: unknown;
    __NEXT_DATA__?: { assetPrefix?: string };
  };

  const manifest = resolveManifest(win.__BUILD_MANIFEST);
  if (!manifest) {
    return;
  }
  const cssManifest = resolveManifest(win.__BUILD_MANIFEST_CSS);
  const assetPrefix = win.__NEXT_DATA__?.assetPrefix ?? '';

  const variations = new Set<string>();
  variations.add(route);
  if (route !== '/' && route.endsWith('/')) {
    variations.add(route.replace(/\/+$/, ''));
  } else if (route !== '/') {
    variations.add(`${route}/`);
  }
  if (route !== '/' && !route.endsWith('/index')) {
    variations.add(`${route}/index`);
  }

  let found = false;
  const seen = new Set<string>();
  variations.forEach((key) => {
    const manifestEntries = manifest[key];
    if (Array.isArray(manifestEntries)) {
      manifestEntries.forEach((entry) => {
        if (seen.has(entry)) {
          return;
        }
        seen.add(entry);
        const url = toAbsoluteAssetUrl(entry, assetPrefix);
        if (!url) {
          return;
        }
        ensurePrefetchLink(url, entry.endsWith('.css') ? 'style' : 'script');
        found = true;
      });
    }

    const cssEntries = cssManifest?.[key];
    if (Array.isArray(cssEntries)) {
      cssEntries.forEach((entry) => {
        if (seen.has(entry)) {
          return;
        }
        seen.add(entry);
        const url = toAbsoluteAssetUrl(entry, assetPrefix);
        if (!url) {
          return;
        }
        ensurePrefetchLink(url, 'style');
        found = true;
      });
    }
  });

  if (found) {
    prefetchedRouteAssets.add(route);
  }
};

export type AppIconProps = {
  id: string;
  icon: string;
  name: string;
  displayName?: ReactNode;
  openApp: (id: string) => void;
  disabled?: boolean;
  prefetch?: () => void | Promise<unknown>;
};

const AppIcon = ({
  id,
  icon,
  name,
  displayName,
  openApp,
  disabled = false,
  prefetch,
}: AppIconProps) => {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const launchTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const prefetchedRef = useRef(false);

  const route = useMemo(() => {
    if (!id) {
      return null;
    }
    const normalized = id.replace(/^\/+/, '');
    return `/apps/${normalized}`;
  }, [id]);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const triggerPrefetch = useCallback(() => {
    if (prefetchedRef.current || disabled) {
      return;
    }

    prefetchedRef.current = true;
    clearHoverTimer();

    if (typeof prefetch === 'function') {
      try {
        const maybePromise = prefetch();
        if (isPromiseLike(maybePromise)) {
          maybePromise.catch((error) => {
            if (process.env.NODE_ENV !== 'production') {
              console.debug(`App preload failed for ${id}`, error);
            }
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`App preload threw for ${id}`, error);
        }
      }
    }

    if (route) {
      router
        .prefetch(route, undefined, { priority: true })
        .then(() => {
          prefetchRouteChunks(route);
        })
        .catch((error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.debug(`Route prefetch failed for ${route}`, error);
          }
        });

      // Attempt an eager chunk prefetch in case the manifest is already available.
      prefetchRouteChunks(route);
    }
  }, [clearHoverTimer, disabled, id, prefetch, route, router]);

  const schedulePrefetch = useCallback(() => {
    if (prefetchedRef.current || disabled) {
      return;
    }
    clearHoverTimer();
    hoverTimeoutRef.current = window.setTimeout(() => {
      hoverTimeoutRef.current = null;
      triggerPrefetch();
    }, HOVER_PREFETCH_DELAY_MS);
  }, [clearHoverTimer, disabled, triggerPrefetch]);

  const handlePointerEnter = useCallback(() => {
    schedulePrefetch();
  }, [schedulePrefetch]);

  const handlePointerLeave = useCallback(() => {
    clearHoverTimer();
  }, [clearHoverTimer]);

  const handleFocus = useCallback(
    (_event: FocusEvent<HTMLDivElement>) => {
      if (!disabled) {
        triggerPrefetch();
      }
    },
    [disabled, triggerPrefetch],
  );

  const handleBlur = useCallback(() => {
    clearHoverTimer();
  }, [clearHoverTimer]);

  const handleOpen = useCallback(() => {
    if (disabled) {
      return;
    }
    setLaunching(true);
    if (launchTimeoutRef.current !== null) {
      clearTimeout(launchTimeoutRef.current);
    }
    launchTimeoutRef.current = window.setTimeout(() => {
      setLaunching(false);
      launchTimeoutRef.current = null;
    }, 300);
    openApp(id);
  }, [disabled, id, openApp]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOpen();
      }
    },
    [handleOpen],
  );

  useEffect(() => {
    return () => {
      clearHoverTimer();
      if (launchTimeoutRef.current !== null) {
        clearTimeout(launchTimeoutRef.current);
      }
    };
  }, [clearHoverTimer]);

  const className = `${launching ? ' app-icon-launch' : ''}${
    dragging ? ' opacity-70' : ''
  } p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active`;

  return (
    <div
      role="button"
      aria-label={name}
      aria-disabled={disabled}
      data-context="app"
      data-app-id={id}
      draggable
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className={className}
      id={`app-${id}`}
      onDoubleClick={handleOpen}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
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
