import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { toCanvas } from 'html-to-image';

type CountLike =
  | number
  | Array<unknown>
  | { length: number }
  | { size: number }
  | { count: number }
  | null
  | undefined;

type BadgeValue = number | 'dot';

type BadgeOverrideState = BadgeValue | null | undefined;

interface DockBadgeEventDetail {
  appId: string;
  badge?: number | string | boolean | null;
  count?: number | string | null;
  total?: number | string | null;
  value?: number | string | null;
  variant?: string | null;
  type?: string | null;
  dot?: boolean;
  clear?: boolean;
  reset?: boolean;
  notifications?: CountLike;
  tasks?: CountLike;
}

export interface DockItemProps {
  id: string;
  title: string;
  icon: string;
  isClose: Record<string, boolean | undefined>;
  isFocus: Record<string, boolean | undefined>;
  openApp: (id: string) => void;
  isMinimized: Record<string, boolean | undefined>;
  openFromMinimised?: (id: string) => void; // retained for compatibility
  notifications?: CountLike;
  tasks?: CountLike;
  badge?: number | string | boolean | 'dot' | null;
}

type ComputedBadge =
  | { kind: 'count'; value: number }
  | { kind: 'dot' }
  | null;

const BADGE_EVENT_NAMES = ['dock-badge', 'app-badge', 'app-notification-count'];

const clampCount = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return value > 0 ? Math.floor(value) : 0;
};

const getCount = (value: CountLike): number => {
  if (typeof value === 'number') {
    return clampCount(value);
  }
  if (Array.isArray(value)) {
    return clampCount(value.length);
  }
  if (value && typeof value === 'object') {
    if ('length' in value && typeof value.length === 'number') {
      return clampCount(value.length);
    }
    if ('size' in value && typeof value.size === 'number') {
      return clampCount(value.size);
    }
    if ('count' in value && typeof value.count === 'number') {
      return clampCount(value.count);
    }
  }
  return 0;
};

const normaliseBadgeInput = (input: unknown): BadgeOverrideState => {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input === 'boolean') {
    return input ? 'dot' : null;
  }
  if (typeof input === 'number') {
    const value = clampCount(input);
    return value > 0 ? value : null;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || trimmed === 'clear' || trimmed === 'none') return null;
    if (trimmed === 'dot' || trimmed === '•') return 'dot';
    const parsedInt = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(parsedInt)) {
      const value = clampCount(parsedInt);
      return value > 0 ? value : null;
    }
    const parsedFloat = Number.parseFloat(trimmed);
    if (!Number.isNaN(parsedFloat)) {
      const value = clampCount(parsedFloat);
      return value > 0 ? value : null;
    }
    return null;
  }
  if (Array.isArray(input)) {
    const value = clampCount(input.length);
    return value > 0 ? value : null;
  }
  if (input && typeof input === 'object') {
    const value = getCount(input as CountLike);
    return value > 0 ? value : null;
  }
  return undefined;
};

const toBadgeState = (value: BadgeOverrideState, fallbackCount: number): ComputedBadge => {
  if (value === 'dot') {
    return { kind: 'dot' };
  }
  if (typeof value === 'number') {
    const count = clampCount(value);
    return count > 0 ? { kind: 'count', value: count } : fallbackCount > 0 ? { kind: 'count', value: fallbackCount } : null;
  }
  if (value === null) {
    return fallbackCount > 0 ? { kind: 'count', value: fallbackCount } : null;
  }
  if (value === undefined) {
    return fallbackCount > 0 ? { kind: 'count', value: fallbackCount } : null;
  }
  return null;
};

const parseBadgeDetail = (detail: DockBadgeEventDetail | undefined): BadgeOverrideState => {
  if (!detail) return undefined;
  if (detail.reset) return undefined;
  if (detail.clear) return null;

  const variant = (detail.variant ?? detail.type)?.toLowerCase?.();
  if (variant === 'dot') return 'dot';
  if (variant === 'clear' || variant === 'none') return null;

  if (detail.dot) return 'dot';

  const detailCounts = getCount(detail.notifications ?? null) + getCount(detail.tasks ?? null);

  const candidate =
    detail.badge ??
    detail.count ??
    detail.total ??
    detail.value ??
    (detailCounts > 0 ? detailCounts : undefined);

  const normalised = normaliseBadgeInput(candidate);
  if (normalised !== undefined) {
    return normalised;
  }

  return undefined;
};

const DockItem: React.FC<DockItemProps> = ({
  id,
  title,
  icon,
  isClose,
  isFocus,
  openApp,
  isMinimized,
  notifications,
  tasks,
  badge,
}) => {
  const [showTitle, setShowTitle] = useState(false);
  const [scaleImage, setScaleImage] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [badgeOverride, setBadgeOverride] = useState<BadgeOverrideState>(undefined);

  const scaleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (scaleTimeoutRef.current) {
        clearTimeout(scaleTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setBadgeOverride(undefined);
  }, [id]);

  const aggregatedCount = useMemo(() => {
    return getCount(notifications ?? null) + getCount(tasks ?? null);
  }, [notifications, tasks]);

  const propBadge = useMemo(() => normaliseBadgeInput(badge), [badge]);

  const computedBadge: ComputedBadge = useMemo(() => {
    if (propBadge !== undefined) {
      return toBadgeState(propBadge, aggregatedCount);
    }
    if (badgeOverride !== undefined) {
      return toBadgeState(badgeOverride, aggregatedCount);
    }
    return aggregatedCount > 0 ? { kind: 'count', value: aggregatedCount } : null;
  }, [aggregatedCount, badgeOverride, propBadge]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<DockBadgeEventDetail>;
      const detail = custom.detail;
      if (!detail || detail.appId !== id) return;

      if (detail.reset) {
        setBadgeOverride(undefined);
        return;
      }

      const parsed = parseBadgeDetail(detail);
      if (parsed !== undefined) {
        setBadgeOverride(parsed);
      }
    };

    BADGE_EVENT_NAMES.forEach(eventName => {
      window.addEventListener(eventName, handler as EventListener);
    });

    return () => {
      BADGE_EVENT_NAMES.forEach(eventName => {
        window.removeEventListener(eventName, handler as EventListener);
      });
    };
  }, [id]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & {
      setAppBadge?: (value: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    if (computedBadge?.kind === 'dot') {
      nav.setAppBadge?.(1).catch(() => {});
    } else if (computedBadge?.kind === 'count' && computedBadge.value > 0) {
      nav.setAppBadge?.(computedBadge.value).catch(() => {});
    } else {
      nav.clearAppBadge?.().catch(() => {});
    }
  }, [computedBadge]);

  const triggerScale = () => {
    if (scaleTimeoutRef.current) {
      clearTimeout(scaleTimeoutRef.current);
    }
    setScaleImage(true);
    scaleTimeoutRef.current = setTimeout(() => {
      setScaleImage(false);
    }, 1000);
  };

  const captureThumbnail = async () => {
    const node = document.getElementById(id);
    if (!node) return;

    let dataUrl: string | null = null;
    const canvas = node.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas && typeof canvas.toDataURL === 'function') {
      try {
        dataUrl = canvas.toDataURL();
      } catch (e) {
        dataUrl = null;
      }
    }

    if (!dataUrl) {
      try {
        const tempCanvas = await toCanvas(node);
        dataUrl = tempCanvas.toDataURL();
      } catch (e) {
        dataUrl = null;
      }
    }

    if (dataUrl && mountedRef.current) {
      setThumbnail(dataUrl);
    }
  };

  const handleOpenApp = () => {
    const isClosed = isClose?.[id];
    const minimised = isMinimized?.[id];

    if (!minimised && isClosed !== false) {
      triggerScale();
    }

    openApp(id);
    setShowTitle(false);
    setThumbnail(null);
  };

  const handleMouseEnter = () => {
    void captureThumbnail();
    setShowTitle(true);
  };

  const handleMouseLeave = () => {
    setShowTitle(false);
    setThumbnail(null);
  };

  const isClosed = isClose?.[id];
  const isRunning = isClosed === false;
  const isFocused = Boolean(isFocus?.[id]);

  const badgeLabel = useMemo(() => {
    if (!computedBadge) return null;
    if (computedBadge.kind === 'dot') return 'New activity';
    const count = computedBadge.value;
    if (count > 99) return '99 or more notifications';
    if (count === 1) return '1 notification';
    return `${count} notifications`;
  }, [computedBadge]);

  const ariaLabel = badgeLabel ? `${title}, ${badgeLabel}` : title;
  const badgeDisplay = computedBadge?.kind === 'count'
    ? (computedBadge.value > 99 ? '99+' : computedBadge.value.toString())
    : null;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-context="app"
      data-app-id={id}
      onClick={handleOpenApp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${isRunning && isFocused ? 'bg-white bg-opacity-10 ' : ''}w-auto p-2 outline-none relative hover:bg-white hover:bg-opacity-10 rounded m-1 transition-hover transition-active`}
      id={`sidebar-${id}`}
    >
      <Image
        width={28}
        height={28}
        className="w-7"
        src={icon.replace('./', '/')}
        alt="Ubuntu App Icon"
        sizes="28px"
      />
      <Image
        width={28}
        height={28}
        className={`${scaleImage ? ' scale ' : ''}scalable-app-icon w-7 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
        src={icon.replace('./', '/')}
        alt=""
        sizes="28px"
      />
      {isRunning ? (
        <div className="w-2 h-1 absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white rounded-md" />
      ) : null}
      {computedBadge?.kind === 'dot' && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
      )}
      {badgeDisplay && (
        <span
          className="absolute -top-1 right-0 min-w-[1.25rem] px-1 text-[0.625rem] leading-4 font-semibold text-white bg-red-500 rounded-full border border-black border-opacity-20"
          aria-hidden="true"
        >
          {badgeDisplay}
        </span>
      )}
      {thumbnail && (
        <div
          className={`${showTitle ? ' visible ' : ' invisible '}pointer-events-none absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 rounded border border-gray-400 border-opacity-40 shadow-lg overflow-hidden bg-black bg-opacity-50`}
        >
          <Image
            width={128}
            height={80}
            src={thumbnail}
            alt={`Preview of ${title}`}
            className="w-32 h-20 object-cover"
            sizes="128px"
          />
        </div>
      )}
      <div
        className={`${showTitle ? ' visible ' : ' invisible '}w-max py-0.5 px-1.5 absolute top-1.5 left-full ml-3 m-1 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md`}
      >
        {title}
      </div>
    </button>
  );
};

export default DockItem;
