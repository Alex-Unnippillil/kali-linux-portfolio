import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

type TaskbarApp = {
    id: string;
    title: string;
    icon: string;
};

type TaskbarProps = {
    apps: TaskbarApp[];
    closed_windows: Record<string, boolean | undefined>;
    minimized_windows: Record<string, boolean | undefined>;
    focused_windows: Record<string, boolean | undefined>;
    openApp: (id: string) => void;
    minimize: (id: string) => void;
};

type OverflowState = {
    ids: string[];
};

type ButtonVariant = 'taskbar' | 'overflow';

type ButtonCommonProps = {
    app: TaskbarApp;
    isActive: boolean;
    isMinimized: boolean;
    variant: ButtonVariant;
    onAction?: (app: TaskbarApp) => void;
};

type ButtonProps = ButtonCommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

const baseButtonClasses =
    'relative flex items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors';
const taskbarButtonPadding = 'mx-1 px-2 py-1';
const overflowButtonPadding = 'w-full px-3 py-2';

function getButtonClasses(variant: ButtonVariant, isActive: boolean) {
    const activeClasses = isActive ? ' bg-white bg-opacity-20' : '';
    const variantPadding = variant === 'taskbar' ? taskbarButtonPadding : overflowButtonPadding;
    const hoverClasses = ' hover:bg-white hover:bg-opacity-10';
    return `${baseButtonClasses} ${variantPadding}${activeClasses}${hoverClasses}`.trim();
}

function getIconSource(icon: string) {
    return icon ? icon.replace('./', '/') : icon;
}

function TaskbarButton(
    { app, isActive, isMinimized, variant, onAction, onClick, ...rest }: ButtonProps,
    ref: React.Ref<HTMLButtonElement>
) {
    const iconSrc = getIconSource(app.icon);

    return (
        <button
            {...rest}
            ref={ref}
            type="button"
            aria-label={app.title}
            className={`${getButtonClasses(variant, isActive)} ${rest.className ?? ''}`.trim()}
            onClick={event => {
                onClick?.(event);
                if (!event.defaultPrevented && onAction) {
                    onAction(app);
                }
            }}
        >
            <Image
                width={24}
                height={24}
                className="w-5 h-5"
                src={iconSrc}
                alt=""
                sizes="24px"
            />
            <span className="ml-1 text-sm text-white whitespace-nowrap">{app.title}</span>
            {!isActive && !isMinimized && variant === 'taskbar' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
            )}
        </button>
    );
}

const ForwardedTaskbarButton = React.forwardRef<HTMLButtonElement, ButtonProps>(TaskbarButton);
ForwardedTaskbarButton.displayName = 'TaskbarButton';

const isSameOrder = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);

export default function Taskbar({
    apps,
    closed_windows,
    minimized_windows,
    focused_windows,
    openApp,
    minimize,
}: TaskbarProps) {
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const measurementRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
    const overflowButtonRef = useRef<HTMLButtonElement | null>(null);
    const overflowMenuRef = useRef<HTMLDivElement | null>(null);
    const overflowItemRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
    const [overflowState, setOverflowState] = useState<OverflowState>({ ids: [] });
    const [isOverflowOpen, setOverflowOpen] = useState(false);
    const menuId = useId();

    const runningApps = useMemo(
        () => apps.filter(app => closed_windows[app.id] === false),
        [apps, closed_windows]
    );

    const overflowSet = useMemo(() => new Set(overflowState.ids), [overflowState.ids]);
    const visibleApps = useMemo(
        () => runningApps.filter(app => !overflowSet.has(app.id)),
        [runningApps, overflowSet]
    );
    const overflowApps = useMemo(
        () => runningApps.filter(app => overflowSet.has(app.id)),
        [runningApps, overflowSet]
    );

    const setMeasurementRef = useCallback((appId: string, node: HTMLButtonElement | null) => {
        if (node) {
            measurementRefs.current.set(appId, node);
        } else {
            measurementRefs.current.delete(appId);
        }
    }, []);

    const setOverflowItemRef = useCallback((appId: string, node: HTMLButtonElement | null) => {
        if (node) {
            overflowItemRefs.current.set(appId, node);
        } else {
            overflowItemRefs.current.delete(appId);
        }
    }, []);

    const handleAppAction = useCallback(
        (app: TaskbarApp) => {
            const id = app.id;
            const isMinimized = Boolean(minimized_windows[id]);
            const isFocused = Boolean(focused_windows[id]);

            if (isMinimized) {
                openApp(id);
            } else if (isFocused) {
                minimize(id);
            } else {
                openApp(id);
            }
            setOverflowOpen(false);
        },
        [focused_windows, minimized_windows, minimize, openApp]
    );

    const updateOverflow = useCallback(() => {
        const toolbar = toolbarRef.current;
        if (!toolbar) {
            return;
        }

        const containerWidth = toolbar.clientWidth;
        if (containerWidth <= 0) {
            setOverflowState(prev => (prev.ids.length ? { ids: [] } : prev));
            return;
        }

        const measurementWidths = runningApps.map(app => {
            const node = measurementRefs.current.get(app.id);
            return node ? node.offsetWidth : 0;
        });
        const totalWidth = measurementWidths.reduce((sum, width) => sum + width, 0);

        if (totalWidth <= containerWidth) {
            setOverflowState(prev => (prev.ids.length ? { ids: [] } : prev));
            return;
        }

        const overflowToggleWidth = overflowButtonRef.current?.offsetWidth ?? 0;
        const availableWidth = Math.max(containerWidth - overflowToggleWidth, 0);
        const newOverflow: string[] = [];
        let usedWidth = 0;

        runningApps.forEach((app, index) => {
            const width = measurementWidths[index];
            if (usedWidth + width > availableWidth) {
                newOverflow.push(app.id);
            } else {
                usedWidth += width;
            }
        });

        setOverflowState(prev => (isSameOrder(prev.ids, newOverflow) ? prev : { ids: newOverflow }));
    }, [runningApps]);

    const focusOverflowItem = useCallback(
        (index: number) => {
            const app = overflowApps[index];
            if (!app) return;
            const node = overflowItemRefs.current.get(app.id);
            node?.focus();
        },
        [overflowApps]
    );

    useLayoutEffect(() => {
        updateOverflow();
    }, [updateOverflow]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => updateOverflow());
            if (toolbarRef.current) {
                observer.observe(toolbarRef.current);
            }
            return () => {
                observer.disconnect();
            };
        }

        const handleResize = () => updateOverflow();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [updateOverflow]);

    useEffect(() => {
        if (!overflowApps.length) {
            setOverflowOpen(false);
        }
    }, [overflowApps.length]);

    useEffect(() => {
        if (!isOverflowOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (
                !overflowMenuRef.current?.contains(target) &&
                !overflowButtonRef.current?.contains(target)
            ) {
                setOverflowOpen(false);
            }
        };

        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target as Node;
            if (
                !overflowMenuRef.current?.contains(target) &&
                !overflowButtonRef.current?.contains(target)
            ) {
                setOverflowOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('focusin', handleFocusIn);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, [isOverflowOpen]);

    useEffect(() => {
        if (!isOverflowOpen) {
            return;
        }
        focusOverflowItem(0);
    }, [isOverflowOpen, focusOverflowItem]);

    const handleOverflowKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (!overflowApps.length) {
                return;
            }
            const keysToPrevent = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'];
            if (keysToPrevent.includes(event.key)) {
                event.preventDefault();
            }
            const activeElement = document.activeElement as HTMLElement | null;
            const currentIndex = overflowApps.findIndex(app =>
                overflowItemRefs.current.get(app.id) === activeElement
            );

            switch (event.key) {
                case 'ArrowDown':
                case 'ArrowRight': {
                    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % overflowApps.length;
                    focusOverflowItem(nextIndex);
                    break;
                }
                case 'ArrowUp':
                case 'ArrowLeft': {
                    const prevIndex = currentIndex < 0 ? overflowApps.length - 1 : (currentIndex - 1 + overflowApps.length) % overflowApps.length;
                    focusOverflowItem(prevIndex);
                    break;
                }
                case 'Home':
                    focusOverflowItem(0);
                    break;
                case 'End':
                    focusOverflowItem(overflowApps.length - 1);
                    break;
                case 'Escape':
                    setOverflowOpen(false);
                    overflowButtonRef.current?.focus();
                    break;
                default:
                    break;
            }
        },
        [focusOverflowItem, overflowApps]
    );

    const handleToggleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLButtonElement>) => {
            if (!overflowApps.length) {
                return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setOverflowOpen(true);
            }
        },
        [overflowApps.length]
    );

    const overflowMenuStyles = isOverflowOpen
        ? 'opacity-100 pointer-events-auto translate-y-0'
        : 'opacity-0 pointer-events-none translate-y-2';

    return (
        <div
            ref={toolbarRef}
            className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40 px-2 gap-1 overflow-hidden"
            role="toolbar"
        >
            <div className="flex items-center gap-1 overflow-hidden flex-1">
                {visibleApps.map(app => {
                    const id = app.id;
                    const isMinimized = Boolean(minimized_windows[id]);
                    const isActive = Boolean(focused_windows[id] && !isMinimized);

                    return (
                        <ForwardedTaskbarButton
                            key={id}
                            app={app}
                            isActive={isActive}
                            isMinimized={isMinimized}
                            variant="taskbar"
                            data-context="taskbar"
                            data-app-id={id}
                            onAction={handleAppAction}
                        />
                    );
                })}
            </div>

            <button
                ref={overflowButtonRef}
                type="button"
                className={`flex items-center justify-center w-9 h-9 rounded hover:bg-white hover:bg-opacity-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white text-white transition-colors ${
                    overflowApps.length ? '' : 'absolute -z-10 opacity-0 pointer-events-none'
                }`}
                aria-label="Show more running applications"
                aria-haspopup="menu"
                aria-expanded={isOverflowOpen}
                aria-controls={menuId}
                aria-hidden={overflowApps.length ? undefined : true}
                disabled={!overflowApps.length}
                onClick={() => {
                    if (!overflowApps.length) return;
                    setOverflowOpen(prev => !prev);
                }}
                onKeyDown={handleToggleKeyDown}
            >
                <svg
                    className={`w-4 h-4 transition-transform ${isOverflowOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            <div
                ref={overflowMenuRef}
                id={menuId}
                role="menu"
                aria-label="Overflow taskbar items"
                className={`absolute bottom-full right-2 mb-2 min-w-[200px] rounded-md bg-black/80 backdrop-blur border border-white/10 shadow-lg transition-all duration-150 ${overflowMenuStyles}`}
                onKeyDown={handleOverflowKeyDown}
            >
                <div className="py-2 flex flex-col">
                    {overflowApps.map(app => {
                        const id = app.id;
                        const isMinimized = Boolean(minimized_windows[id]);
                        const isActive = Boolean(focused_windows[id] && !isMinimized);
                    return (
                        <ForwardedTaskbarButton
                            key={id}
                            app={app}
                            isActive={isActive}
                            isMinimized={isMinimized}
                            variant="overflow"
                            data-context="taskbar-overflow"
                            data-app-id={id}
                            ref={node => setOverflowItemRef(id, node)}
                            role="menuitem"
                            onAction={handleAppAction}
                        />
                    );
                })}
            </div>
            </div>

            <div
                aria-hidden="true"
                className="absolute top-0 left-0 flex px-2 gap-1 pointer-events-none"
                style={{ visibility: 'hidden' }}
            >
                {runningApps.map(app => {
                    const id = app.id;
                    const isMinimized = Boolean(minimized_windows[id]);
                    const isActive = Boolean(focused_windows[id] && !isMinimized);
                    return (
                        <ForwardedTaskbarButton
                            key={id}
                            app={app}
                            isActive={isActive}
                            isMinimized={isMinimized}
                            variant="taskbar"
                            data-app-id={id}
                            data-measurement="true"
                            ref={node => setMeasurementRef(id, node)}
                            tabIndex={-1}
                        />
                    );
                })}
            </div>
        </div>
    );
}
