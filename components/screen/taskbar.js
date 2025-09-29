import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { toPng } from 'html-to-image';
import ContextMenu from '../common/ContextMenu';

const PREVIEW_DELAY_MS = 150;
const PREVIEW_STALE_MS = 15000;

function PreviewCard({
    app,
    isVisible,
    status,
    image,
}) {
    const hasImage = Boolean(image);
    const id = `taskbar-preview-${app.id}`;

    return (
        <div
            id={id}
            role="tooltip"
            aria-hidden={!isVisible}
            className={`${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} pointer-events-none transition-all duration-150 ease-out absolute -top-32 left-1/2 -translate-x-1/2 w-48 rounded-md shadow-lg bg-gray-900 bg-opacity-95 border border-gray-800 p-2 text-white`}
        >
            <div className="text-xs font-semibold mb-1 truncate" title={app.title}>
                {app.title}
            </div>
            <div className="relative w-full h-24 overflow-hidden rounded bg-black bg-opacity-40 flex items-center justify-center">
                {hasImage && (
                    <img
                        src={image}
                        alt=""
                        className="max-h-full w-full object-cover"
                        aria-hidden="true"
                    />
                )}
                {!hasImage && status === 'loading' && (
                    <span className="text-[11px] text-gray-300">Capturing preview…</span>
                )}
                {!hasImage && status === 'error' && (
                    <span className="text-[11px] text-gray-400">Preview unavailable</span>
                )}
            </div>
        </div>
    );
}

function TaskbarButton({
    app,
    isMinimized,
    isFocused,
    isPreviewActive,
    preview,
    onRequestPreview,
    onCancelPreview,
    onClick,
    onMinimize,
    onNewInstance,
    onClose,
}) {
    const buttonRef = useRef(null);
    const previewStatus = preview?.status;
    const previewImage = preview?.image || null;
    const isActive = !isMinimized;

    const menuItems = useMemo(() => {
        const items = [];
        items.push({
            label: 'Open',
            onSelect: () => onClick(),
        });
        items.push({
            label: isMinimized ? 'Restore' : 'Minimize',
            onSelect: () => onMinimize(),
        });
        if (typeof onNewInstance === 'function') {
            items.push({
                label: 'New Window',
                onSelect: () => onNewInstance(),
            });
        }
        if (typeof onClose === 'function') {
            items.push({
                label: 'Close',
                onSelect: () => onClose(),
            });
        }
        return items;
    }, [isMinimized, onClick, onMinimize, onNewInstance, onClose]);

    const handlePointerEnter = useCallback(() => {
        onRequestPreview(app.id);
    }, [app.id, onRequestPreview]);

    const handlePointerLeave = useCallback(() => {
        onCancelPreview(app.id);
    }, [app.id, onCancelPreview]);

    const handleFocus = useCallback(() => {
        onRequestPreview(app.id);
    }, [app.id, onRequestPreview]);

    const handleBlur = useCallback(() => {
        onCancelPreview(app.id);
    }, [app.id, onCancelPreview]);

    const handleMouseDown = useCallback((event) => {
        if (event.button === 1) {
            event.preventDefault();
            if (typeof onNewInstance === 'function') {
                onNewInstance();
            } else {
                onClick();
            }
        }
    }, [onClick, onNewInstance]);

    return (
        <div className="relative mx-1">
            <button
                ref={buttonRef}
                type="button"
                aria-label={app.title}
                aria-describedby={isPreviewActive ? `taskbar-preview-${app.id}` : undefined}
                data-context="taskbar"
                data-app-id={app.id}
                data-active={isActive ? 'true' : 'false'}
                aria-pressed={isActive}
                onClick={onClick}
                onMouseDown={handleMouseDown}
                onMouseEnter={handlePointerEnter}
                onMouseLeave={handlePointerLeave}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={`${isFocused && isActive ? 'bg-white bg-opacity-20 ' : ''}relative flex items-center px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition`}
            >
                <Image
                    width={24}
                    height={24}
                    className="w-5 h-5"
                    src={app.icon.replace('./', '/')}
                    alt=""
                    sizes="24px"
                />
                <span className="ml-1 text-sm text-white whitespace-nowrap">{app.title}</span>
                {isActive && (
                    <span
                        aria-hidden="true"
                        data-testid="running-indicator"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded"
                    />
                )}
                <PreviewCard
                    app={app}
                    isVisible={isPreviewActive}
                    status={previewStatus}
                    image={previewImage}
                />
            </button>
            <ContextMenu targetRef={buttonRef} items={menuItems} />
        </div>
    );
}

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const [activePreview, setActivePreview] = useState(null);
    const [previewState, setPreviewState] = useState({});
    const previewCacheRef = useRef(new Map());
    const delayHandles = useRef(new Map());
    const idleHandles = useRef(new Map());

    const cancelScheduledCapture = useCallback((appId) => {
        const delayHandle = delayHandles.current.get(appId);
        if (delayHandle) {
            if (typeof window !== 'undefined') {
                window.clearTimeout(delayHandle);
            }
            delayHandles.current.delete(appId);
        }
        const idleHandle = idleHandles.current.get(appId);
        if (idleHandle) {
            if (typeof window !== 'undefined') {
                if ('cancelIdleCallback' in window) {
                    window.cancelIdleCallback(idleHandle);
                } else {
                    window.clearTimeout(idleHandle);
                }
            }
            idleHandles.current.delete(appId);
        }
    }, []);

    const updatePreviewState = useCallback((appId, next) => {
        setPreviewState(prev => ({
            ...prev,
            [appId]: {
                status: next.status ?? prev[appId]?.status,
                image: next.image !== undefined ? next.image : prev[appId]?.image,
            },
        }));
    }, []);

    const capturePreview = useCallback(async (appId) => {
        const entry = previewCacheRef.current.get(appId);
        if (entry && Date.now() - entry.timestamp < PREVIEW_STALE_MS) {
            updatePreviewState(appId, { status: 'ready', image: entry.image });
            return;
        }

        updatePreviewState(appId, { status: 'loading' });

        const node = typeof document !== 'undefined' ? document.getElementById(appId) : null;
        if (!node) {
            updatePreviewState(appId, { status: 'error', image: null });
            return;
        }

        try {
            const pixelRatio = typeof window !== 'undefined'
                ? Math.min(window.devicePixelRatio || 1, 2)
                : 1;
            const image = await toPng(node, {
                cacheBust: false,
                pixelRatio,
                skipAutoScale: true,
                filter: (element) => {
                    return !element?.hasAttribute?.('aria-hidden');
                },
            });
            previewCacheRef.current.set(appId, { image, timestamp: Date.now() });
            updatePreviewState(appId, { status: 'ready', image });
        } catch (error) {
            updatePreviewState(appId, { status: 'error', image: null });
        }
    }, [updatePreviewState]);

    const scheduleCapture = useCallback((appId) => {
        cancelScheduledCapture(appId);
        if (typeof window === 'undefined') return;
        const delayId = window.setTimeout(() => {
            const runCapture = () => capturePreview(appId);
            if ('requestIdleCallback' in window) {
                const idleId = window.requestIdleCallback(runCapture, { timeout: 500 });
                idleHandles.current.set(appId, idleId);
            } else {
                const idleId = window.setTimeout(runCapture, 50);
                idleHandles.current.set(appId, idleId);
            }
        }, PREVIEW_DELAY_MS);
        delayHandles.current.set(appId, delayId);
    }, [cancelScheduledCapture, capturePreview]);

    const handleRequestPreview = useCallback((appId) => {
        setActivePreview(appId);
        scheduleCapture(appId);
    }, [scheduleCapture]);

    const handleCancelPreview = useCallback((appId) => {
        cancelScheduledCapture(appId);
        setActivePreview((current) => (current === appId ? null : current));
    }, [cancelScheduledCapture]);

    useEffect(() => () => {
        if (typeof window !== 'undefined') {
            Array.from(delayHandles.current.values()).forEach((handle) => window.clearTimeout(handle));
            Array.from(idleHandles.current.values()).forEach((handle) => {
                if ('cancelIdleCallback' in window) {
                    window.cancelIdleCallback(handle);
                } else {
                    window.clearTimeout(handle);
                }
            });
        }
        delayHandles.current.clear();
        idleHandles.current.clear();
    }, []);

    const handleClick = useCallback((app) => {
        const id = app.id;
        if (props.minimized_windows[id]) {
            props.openApp(id);
        } else if (props.focused_windows[id]) {
            props.minimize(id);
        } else {
            props.openApp(id);
        }
    }, [props]);

    return (
        <div className="absolute bottom-0 left-0 w-full h-12 bg-black bg-opacity-50 flex items-center justify-start px-2 z-40 gap-2" role="toolbar">
            <div className="flex items-center overflow-x-auto">
                {runningApps.map(app => {
                    const isMinimized = Boolean(props.minimized_windows[app.id]);
                    const isFocused = Boolean(props.focused_windows[app.id]);

                    return (
                        <TaskbarButton
                            key={app.id}
                            app={app}
                            isMinimized={isMinimized}
                            isFocused={isFocused}
                            isPreviewActive={activePreview === app.id}
                            preview={previewState[app.id]}
                            onRequestPreview={handleRequestPreview}
                            onCancelPreview={handleCancelPreview}
                            onClick={() => handleClick(app)}
                            onMinimize={() => {
                                if (isMinimized) {
                                    props.openApp(app.id);
                                } else {
                                    props.minimize(app.id);
                                }
                            }}
                            onNewInstance={props.openNewInstance ? () => props.openNewInstance(app.id) : undefined}
                            onClose={props.closeApp ? () => props.closeApp(app.id) : undefined}
                        />
                    );
                })}
            </div>
        </div>
    );
}
