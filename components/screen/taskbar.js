import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Image from 'next/image';

const LONG_PRESS_DELAY_MS = 550;

const toolbarButtonStyle = {
    minHeight: 'var(--shell-hit-target, 2.5rem)',
    minWidth: 'var(--shell-hit-target, 2.5rem)',
    paddingInline: 'calc(var(--shell-taskbar-padding-x, 0.75rem) * 0.75)',
    fontSize: 'var(--shell-taskbar-font-size, 0.875rem)',
    gap: '0.5rem',
};

const menuButtonStyle = {
    minHeight: 'var(--shell-hit-target, 2.5rem)',
    width: '100%',
    paddingInline: 'calc(var(--shell-taskbar-padding-x, 0.75rem))',
    fontSize: 'var(--shell-taskbar-font-size, 0.875rem)',
    gap: '0.75rem',
    justifyContent: 'flex-start',
};

const iconStyle = {
    width: 'var(--shell-taskbar-icon, 1.5rem)',
    height: 'var(--shell-taskbar-icon, 1.5rem)',
};

const indicatorStyle = {
    width: '0.5rem',
    height: '0.25rem',
    background: 'currentColor',
};

function TaskbarButtonContent({ app, isActive }) {
    return (
        <>
            <span
                aria-hidden="true"
                className="flex items-center justify-center"
                style={{ ...iconStyle, flexShrink: 0 }}
            >
                <Image
                    width={32}
                    height={32}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    src={app.icon.replace('./', '/')}
                    alt=""
                    sizes="(max-width: 768px) 32px, 40px"
                />
            </span>
            <span
                className="whitespace-nowrap text-white"
                style={{ fontSize: 'var(--shell-taskbar-font-size, 0.875rem)' }}
            >
                {app.title}
            </span>
            {isActive && (
                <span
                    aria-hidden="true"
                    data-testid="running-indicator"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded"
                    style={indicatorStyle}
                />
            )}
        </>
    );
}

function TaskbarButton({
    app,
    isActive,
    isFocused,
    onActivate,
    variant = 'toolbar',
    interactive = true,
}) {
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const enableLongPress = interactive && variant === 'toolbar';

    const cancelLongPress = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const dispatchContextMenu = useCallback((target) => {
        if (typeof window === 'undefined' || !target) return;
        const rect = target.getBoundingClientRect();
        const contextEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
        });
        target.dispatchEvent(contextEvent);
    }, []);

    const handlePointerDown = useCallback((event) => {
        if (!enableLongPress) return;
        if (event.pointerType === 'mouse') return;
        if (event.button && event.button !== 0) return;

        const target = event.currentTarget;
        cancelLongPress();
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            dispatchContextMenu(target);
        }, LONG_PRESS_DELAY_MS);
    }, [cancelLongPress, dispatchContextMenu, enableLongPress]);

    const handlePointerEnd = useCallback((event) => {
        if (!enableLongPress) return;
        if (longPressTriggeredRef.current) {
            event.preventDefault();
            event.stopPropagation();
        }
        cancelLongPress();
        longPressTriggeredRef.current = false;
    }, [cancelLongPress, enableLongPress]);

    const handleContextMenu = useCallback(() => {
        if (!enableLongPress) return;
        cancelLongPress();
    }, [cancelLongPress, enableLongPress]);

    const handleClick = useCallback((event) => {
        if (!interactive || typeof onActivate !== 'function') return;
        if (longPressTriggeredRef.current) {
            event.preventDefault();
            event.stopPropagation();
            longPressTriggeredRef.current = false;
            return;
        }
        cancelLongPress();
        onActivate();
    }, [cancelLongPress, interactive, onActivate]);

    useEffect(() => () => {
        cancelLongPress();
    }, [cancelLongPress]);

    const baseClass = variant === 'menu'
        ? 'relative flex w-full items-center rounded-md text-left text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
        : 'relative flex items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

    const activeClass = isFocused && isActive ? ' bg-white bg-opacity-20' : '';
    const className = `${baseClass}${activeClass}`;
    const style = variant === 'menu' ? menuButtonStyle : toolbarButtonStyle;

    return (
        <button
            type="button"
            aria-hidden={interactive ? undefined : 'true'}
            tabIndex={interactive ? 0 : -1}
            aria-label={app.title}
            data-context="taskbar"
            data-app-id={app.id}
            data-active={isActive ? 'true' : 'false'}
            aria-pressed={interactive ? isActive : undefined}
            onClick={interactive ? handleClick : undefined}
            onPointerDown={enableLongPress ? handlePointerDown : undefined}
            onPointerUp={enableLongPress ? handlePointerEnd : undefined}
            onPointerLeave={enableLongPress ? handlePointerEnd : undefined}
            onPointerCancel={enableLongPress ? handlePointerEnd : undefined}
            onContextMenu={handleContextMenu}
            className={className}
            style={style}
        >
            <TaskbarButtonContent app={app} isActive={isActive} />
        </button>
    );
}

export default function Taskbar(props) {
    const {
        apps,
        closed_windows: closedWindows,
        minimized_windows: minimizedWindows,
        focused_windows: focusedWindows,
        openApp,
        minimize,
    } = props;

    const runningApps = useMemo(
        () => apps.filter(app => closedWindows[app.id] === false),
        [apps, closedWindows]
    );

    const containerRef = useRef(null);
    const measurementRef = useRef(null);
    const moreMeasurementRef = useRef(null);
    const moreButtonRef = useRef(null);
    const overflowMenuRef = useRef(null);

    const [visibleCount, setVisibleCount] = useState(runningApps.length);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [isOverflowMenuOpen, setOverflowMenuOpen] = useState(false);

    useEffect(() => {
        setVisibleCount(runningApps.length);
    }, [runningApps.length]);

    const visibleApps = useMemo(
        () => runningApps.slice(0, Math.max(0, visibleCount)),
        [runningApps, visibleCount]
    );

    const overflowApps = useMemo(
        () => runningApps.slice(Math.max(0, visibleCount)),
        [runningApps, visibleCount]
    );

    const handleAppClick = useCallback((app) => {
        const id = app.id;
        if (minimizedWindows[id]) {
            openApp(id);
        } else if (focusedWindows[id]) {
            minimize(id);
        } else {
            openApp(id);
        }
    }, [focusedWindows, minimize, minimizedWindows, openApp]);

    const handleOverflowAppClick = useCallback((app) => {
        setOverflowMenuOpen(false);
        handleAppClick(app);
    }, [handleAppClick]);

    const measureOverflow = useCallback(() => {
        if (typeof window === 'undefined') return;

        const container = containerRef.current;
        const measurement = measurementRef.current;
        if (!container || !measurement) {
            setHasOverflow(false);
            setVisibleCount(0);
            return;
        }

        const availableWidth = container.clientWidth;
        const computedStyle = window.getComputedStyle(container);
        const gapValue = computedStyle.columnGap || computedStyle.gap || '0';
        const gap = parseFloat(gapValue) || 0;
        const moreWidth = moreMeasurementRef.current
            ? moreMeasurementRef.current.getBoundingClientRect().width
            : (moreButtonRef.current ? moreButtonRef.current.offsetWidth : 0);

        const buttons = Array.from(measurement.querySelectorAll('[data-app-id]'));
        const widths = buttons.map(button => button.getBoundingClientRect().width);

        if (!widths.length) {
            setHasOverflow(false);
            setVisibleCount(0);
            return;
        }

        if (availableWidth <= 0) {
            setHasOverflow(widths.length > 0);
            setVisibleCount(0);
            return;
        }

        const totalWidth = widths.reduce((acc, width, index) => acc + width + (index > 0 ? gap : 0), 0);

        if (totalWidth <= availableWidth) {
            setHasOverflow(false);
            setVisibleCount(widths.length);
            return;
        }

        const reservedForMore = moreWidth > 0 ? moreWidth + (widths.length > 0 ? gap : 0) : 0;
        let maxWidth = availableWidth - reservedForMore;
        if (maxWidth < 0) maxWidth = 0;

        let used = 0;
        let nextVisible = 0;
        for (let index = 0; index < widths.length; index += 1) {
            const width = widths[index];
            const widthWithGap = width + (index > 0 ? gap : 0);
            if (used + widthWithGap > maxWidth) {
                break;
            }
            used += widthWithGap;
            nextVisible = index + 1;
        }

        const nextHasOverflow = nextVisible < widths.length;
        setVisibleCount(prev => (prev === nextVisible ? prev : nextVisible));
        setHasOverflow(prev => (prev === nextHasOverflow ? prev : nextHasOverflow));
    }, []);

    useLayoutEffect(() => {
        measureOverflow();
    }, [measureOverflow, runningApps.length]);

    useEffect(() => {
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => {
                measureOverflow();
            });
            if (containerRef.current) {
                observer.observe(containerRef.current);
            }
            return () => {
                observer.disconnect();
            };
        }

        const handleResize = () => measureOverflow();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [measureOverflow]);

    useEffect(() => {
        if (!isOverflowMenuOpen) return;

        const handlePointerDown = (event) => {
            if (
                overflowMenuRef.current?.contains(event.target) ||
                moreButtonRef.current?.contains(event.target)
            ) {
                return;
            }
            setOverflowMenuOpen(false);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOverflowMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOverflowMenuOpen]);

    useEffect(() => {
        if (isOverflowMenuOpen) {
            const firstItem = overflowMenuRef.current?.querySelector('button');
            firstItem?.focus();
        }
    }, [isOverflowMenuOpen]);

    useEffect(() => {
        if (!hasOverflow && isOverflowMenuOpen) {
            setOverflowMenuOpen(false);
        }
    }, [hasOverflow, isOverflowMenuOpen]);

    const toggleOverflowMenu = useCallback(() => {
        setOverflowMenuOpen(prev => !prev);
    }, []);

    return (
        <div
            className="absolute bottom-0 left-0 z-40 flex w-full items-center justify-start bg-black bg-opacity-50 backdrop-blur-sm"
            role="toolbar"
            style={{
                position: 'absolute',
                minHeight: 'calc(var(--shell-taskbar-height, 2.5rem) + var(--safe-area-bottom, 0px))',
                paddingTop: '0.35rem',
                paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 0.35rem)',
                paddingLeft: 'calc(var(--shell-taskbar-padding-x, 0.75rem) + var(--safe-area-left, 0px))',
                paddingRight: 'calc(var(--shell-taskbar-padding-x, 0.75rem) + var(--safe-area-right, 0px))',
            }}
        >
            <div className="flex w-full items-center" style={{ gap: 'var(--shell-taskbar-gap, 0.5rem)' }}>
                <div
                    ref={containerRef}
                    className="flex min-h-[var(--shell-hit-target,2.5rem)] flex-1 items-center overflow-hidden"
                    style={{ gap: 'var(--shell-taskbar-gap, 0.5rem)' }}
                >
                    {visibleApps.map(app => {
                        const isMinimized = Boolean(minimizedWindows[app.id]);
                        const isFocused = Boolean(focusedWindows[app.id]);
                        const isActive = !isMinimized;

                        return (
                            <TaskbarButton
                                key={app.id}
                                app={app}
                                isActive={isActive}
                                isFocused={isFocused}
                                onActivate={() => handleAppClick(app)}
                                variant="toolbar"
                                interactive
                            />
                        );
                    })}
                </div>
                {hasOverflow && (
                    <div
                        className="relative flex flex-none items-center"
                        style={{ marginLeft: 'var(--shell-taskbar-gap, 0.5rem)' }}
                    >
                        <button
                            type="button"
                            ref={moreButtonRef}
                            aria-haspopup="menu"
                            aria-expanded={isOverflowMenuOpen}
                            onClick={toggleOverflowMenu}
                            className="relative flex items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                            style={toolbarButtonStyle}
                        >
                            <span className="sr-only">Show more running apps</span>
                            <span
                                aria-hidden="true"
                                className="flex items-center justify-center"
                                style={{ ...iconStyle, fontSize: '1.25rem' }}
                            >
                                ⋯
                            </span>
                            <span
                                className="whitespace-nowrap text-white"
                                style={{ fontSize: 'var(--shell-taskbar-font-size, 0.875rem)' }}
                            >
                                More
                            </span>
                        </button>
                        {isOverflowMenuOpen && (
                            <div
                                ref={overflowMenuRef}
                                role="menu"
                                aria-label="More running apps"
                                className="absolute bottom-full right-0 z-50 mt-2 w-60 rounded-lg border border-white/10 bg-black/80 p-2 text-white shadow-lg backdrop-blur-sm"
                                style={{
                                    minWidth: 'min(18rem, 90vw)',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                <div className="flex flex-col" style={{ gap: '0.25rem' }}>
                                    {overflowApps.map(app => {
                                        const isMinimized = Boolean(minimizedWindows[app.id]);
                                        const isFocused = Boolean(focusedWindows[app.id]);
                                        const isActive = !isMinimized;

                                        return (
                                            <TaskbarButton
                                                key={app.id}
                                                app={app}
                                                isActive={isActive}
                                                isFocused={isFocused}
                                                onActivate={() => handleOverflowAppClick(app)}
                                                variant="menu"
                                                interactive
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div
                ref={measurementRef}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 flex opacity-0"
                style={{
                    gap: 'var(--shell-taskbar-gap, 0.5rem)',
                    zIndex: -1,
                }}
            >
                {runningApps.map(app => {
                    const isMinimized = Boolean(minimizedWindows[app.id]);
                    const isFocused = Boolean(focusedWindows[app.id]);
                    const isActive = !isMinimized;

                    return (
                        <TaskbarButton
                            key={`measurement-${app.id}`}
                            app={app}
                            isActive={isActive}
                            isFocused={isFocused}
                            variant="toolbar"
                            interactive={false}
                        />
                    );
                })}
                <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    ref={moreMeasurementRef}
                    className="relative flex items-center justify-center rounded-lg"
                    style={toolbarButtonStyle}
                >
                    <span style={{ ...iconStyle, fontSize: '1.25rem' }}>⋯</span>
                    <span style={{ fontSize: 'var(--shell-taskbar-font-size, 0.875rem)' }}>More</span>
                </button>
            </div>
        </div>
    );
}
