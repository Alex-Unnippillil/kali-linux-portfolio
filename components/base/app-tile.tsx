import Image from 'next/image';
import Router from 'next/router';
import {
    type CSSProperties,
    type FocusEvent,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

const PREFETCH_THROTTLE_MS = 4000;
const prefetchTimestamps = new Map<string, number>();

const isDev = process.env.NODE_ENV !== 'production';

type PrefetchHandler = () => void | Promise<void>;

type AppTileProps = {
    id: string;
    name: string;
    icon: string;
    openApp: (id: string) => void;
    disabled?: boolean;
    displayName?: ReactNode;
    draggable?: boolean;
    isBeingDragged?: boolean;
    onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel?: (event: PointerEvent<HTMLDivElement>) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
    onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
    style?: CSSProperties;
    assistiveHint?: string;
    assistiveHintId?: string;
    isSelected?: boolean;
    isHovered?: boolean;
    accentVariables?: CSSProperties;
    prefetch?: PrefetchHandler;
    href?: string | null;
};

const reservePrefetchSlot = (key: string): boolean => {
    const now = Date.now();
    const last = prefetchTimestamps.get(key);
    if (typeof last === 'number' && now - last < PREFETCH_THROTTLE_MS) {
        return false;
    }
    prefetchTimestamps.set(key, now);
    return true;
};

const logDebug = (message: string, error?: unknown) => {
    if (!isDev) return;
    if (typeof error !== 'undefined') {
        console.debug(message, error);
    } else {
        console.debug(message);
    }
};

const safeRouterPrefetch = (href: string): boolean => {
    if (typeof window === 'undefined') return false;
    const prefetchFn = (Router && typeof Router.prefetch === 'function') ? Router.prefetch : null;
    if (!prefetchFn) return false;
    try {
        const result = prefetchFn.call(Router, href);
        if (result && typeof (result as Promise<unknown>).catch === 'function') {
            (result as Promise<unknown>).catch((error) => {
                logDebug(`[AppTile] router.prefetch(${href}) rejected`, error);
            });
        }
        return true;
    } catch (error) {
        logDebug(`[AppTile] router.prefetch(${href}) threw`, error);
        return false;
    }
};

const runCustomPrefetch = (handler: PrefetchHandler, id: string): boolean => {
    try {
        const result = handler();
        if (result && typeof (result as Promise<unknown>).catch === 'function') {
            (result as Promise<unknown>).catch((error) => {
                logDebug(`[AppTile] custom prefetch for ${id} rejected`, error);
            });
        }
        return true;
    } catch (error) {
        logDebug(`[AppTile] custom prefetch for ${id} threw`, error);
        return false;
    }
};

const normalizeHref = (id: string, explicit?: string | null): string | null => {
    if (explicit !== undefined && explicit !== null) {
        const trimmed = explicit.trim();
        if (!trimmed) return null;
        return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;
    }
    if (!id) return null;
    const sanitized = id.replace(/\/index$/, '');
    const cleaned = sanitized.replace(/^\/+/, '');
    if (!cleaned) return null;
    return `/apps/${cleaned}`;
};

const AppTile = ({
    id,
    name,
    icon,
    openApp,
    disabled = false,
    displayName,
    draggable = true,
    isBeingDragged = false,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyDown: customKeyDown,
    onBlur,
    style,
    assistiveHint,
    assistiveHintId,
    isSelected = false,
    isHovered = false,
    accentVariables = {},
    prefetch,
    href,
}: AppTileProps) => {
    const [launching, setLaunching] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [prefetched, setPrefetched] = useState(false);
    const launchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const normalizedHref = useMemo(() => normalizeHref(id, href), [id, href]);

    useEffect(() => () => {
        if (launchTimeoutRef.current) {
            clearTimeout(launchTimeoutRef.current);
            launchTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        setPrefetched(false);
    }, [normalizedHref, prefetch]);

    const handleDragStart = useCallback(() => {
        setDragging(true);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDragging(false);
    }, []);

    const launchApp = useCallback(() => {
        if (disabled) return;
        setLaunching(true);
        if (launchTimeoutRef.current) {
            clearTimeout(launchTimeoutRef.current);
        }
        launchTimeoutRef.current = setTimeout(() => {
            setLaunching(false);
            launchTimeoutRef.current = null;
        }, 300);
        openApp(id);
    }, [disabled, id, openApp]);

    const handleActivate = useCallback((event?: { preventDefault?: () => void } | null) => {
        if (disabled) return;
        if (dragging || isBeingDragged) return;
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        launchApp();
    }, [disabled, dragging, isBeingDragged, launchApp]);

    const handlePrefetch = useCallback(() => {
        if (prefetched) return;
        let executed = false;
        if (prefetch) {
            const customKey = `custom:${id}`;
            if (reservePrefetchSlot(customKey)) {
                executed = runCustomPrefetch(prefetch, id) || executed;
            }
        }
        if (normalizedHref) {
            const routeKey = `route:${normalizedHref}`;
            if (reservePrefetchSlot(routeKey)) {
                executed = safeRouterPrefetch(normalizedHref) || executed;
            }
        }
        if (executed) {
            setPrefetched(true);
        }
    }, [id, normalizedHref, prefetch, prefetched]);

    const handlePointerUpInternal = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (onPointerUp) {
            onPointerUp(event);
        }
        if (event.defaultPrevented) {
            return;
        }
        if (event.pointerType === 'touch') {
            handleActivate(event);
        }
    }, [handleActivate, onPointerUp]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
        if (customKeyDown) {
            customKeyDown(event);
            if (event.defaultPrevented) {
                return;
            }
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            launchApp();
        }
    }, [customKeyDown, launchApp]);

    const draggingState = dragging || isBeingDragged;

    const stateStyle: CSSProperties = useMemo(() => {
        if (isSelected) {
            return {
                background: 'var(--desktop-icon-selection-bg, rgba(56, 189, 248, 0.18))',
                boxShadow: 'var(--desktop-icon-selection-glow, 0 0 0 1px rgba(56,189,248,0.7), 0 4px 16px rgba(15,118,110,0.45))',
                borderColor: 'var(--desktop-icon-selection-border, rgba(165, 243, 252, 0.9))',
                fontWeight: 600,
            };
        }
        if (isHovered) {
            return {
                background: 'var(--desktop-icon-hover-bg, rgba(56, 189, 248, 0.12))',
                borderColor: 'var(--desktop-icon-hover-border, rgba(165, 243, 252, 0.35))',
            };
        }
        return {};
    }, [isHovered, isSelected]);

    const combinedStyle: CSSProperties = useMemo(() => ({
        ...accentVariables,
        ...(style || {}),
        width: 'var(--desktop-icon-width, 6rem)',
        minWidth: 'var(--desktop-icon-width, 6rem)',
        height: 'var(--desktop-icon-height, 5.5rem)',
        minHeight: 'var(--desktop-icon-height, 5.5rem)',
        padding: 'var(--desktop-icon-padding, 0.25rem)',
        fontSize: 'var(--desktop-icon-font-size, 0.75rem)',
        gap: 'var(--desktop-icon-gap, 0.375rem)',
        borderColor: 'transparent',
        ...stateStyle,
    }), [accentVariables, stateStyle, style]);

    const labelStyle: CSSProperties = useMemo(() => ({
        textShadow: '0 1px 3px rgba(0,0,0,0.75)',
        lineHeight: 'var(--desktop-icon-line-height, 1.1rem)',
        ...(style || {}),
    }), [style]);

    const hintId = assistiveHint ? (assistiveHintId || `app-${id}-instructions`) : undefined;

    return (
        <div
            role="button"
            aria-label={name}
            aria-disabled={disabled}
            aria-pressed={isSelected ? 'true' : 'false'}
            data-context="app"
            data-app-id={id}
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={handlePointerUpInternal}
            onPointerCancel={onPointerCancel}
            style={combinedStyle}
            className={`${launching ? 'app-icon-launch ' : ''}${draggingState ? 'opacity-70 ' : ''}m-px z-10 outline-none rounded select-none flex flex-col justify-start items-center text-center text-white transition-colors transition-shadow duration-150 ease-out border focus-visible:ring-2 focus-visible:ring-sky-300/70`}
            id={`app-${id}`}
            onDoubleClick={launchApp}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            tabIndex={disabled ? -1 : 0}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
            aria-describedby={hintId}
        >
            <Image
                width={48}
                height={48}
                className="mb-1"
                style={{
                    width: 'var(--desktop-icon-image, 2.5rem)',
                    height: 'var(--desktop-icon-image, 2.5rem)',
                    maxWidth: 'var(--desktop-icon-image, 2.5rem)',
                    maxHeight: 'var(--desktop-icon-image, 2.5rem)',
                }}
                src={icon.replace('./', '/')}
                alt={`Kali ${name}`}
                sizes="(max-width: 768px) 48px, 64px"
            />
            <span className={`leading-tight ${isSelected ? 'font-semibold' : 'font-normal'}`} style={labelStyle}>
                {displayName || name}
            </span>
            {assistiveHint ? (
                <span id={hintId} className="sr-only">
                    {assistiveHint}
                </span>
            ) : null}
        </div>
    );
};

AppTile.displayName = 'AppTile';

export const __clearAppTilePrefetchCacheForTests = () => {
    prefetchTimestamps.clear();
};

export type { AppTileProps };
export default AppTile;
