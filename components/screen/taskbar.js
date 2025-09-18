"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import NetworkTrayIcon from '../panel/NetworkTrayIcon';
import BatteryTrayIcon from '../panel/BatteryTrayIcon';
import VolumeTrayIcon from '../panel/VolumeTrayIcon';

const PREVIEW_REQUEST_EVENT = 'kali-request-preview';
const PREVIEW_RESPONSE_EVENT = 'kali-window-preview';
const WINDOW_STATE_EVENT = 'kali-window-state';

export default function Taskbar(props) {
    const runningApps = useMemo(
        () => props.apps.filter((app) => props.closed_windows[app.id] === false),
        [props.apps, props.closed_windows]
    );

    const pinnedApps = useMemo(() => {
        const favourites = props.favourite_apps || {};
        return props.apps.filter((app) => favourites[app.id]);
    }, [props.apps, props.favourite_apps]);

    const [hoveredApp, setHoveredApp] = useState(null);
    const [preview, setPreview] = useState({ id: null, image: null, status: 'idle' });
    const [windowStates, setWindowStates] = useState({});
    const previewHandlerRef = useRef(null);
    const previewTimeoutRef = useRef(null);
    const previewRequestRef = useRef(null);

    const cancelPreviewRequest = useCallback(() => {
        if (typeof window !== 'undefined' && previewHandlerRef.current) {
            window.removeEventListener(PREVIEW_RESPONSE_EVENT, previewHandlerRef.current);
        }
        previewHandlerRef.current = null;
        if (previewTimeoutRef.current) {
            clearTimeout(previewTimeoutRef.current);
            previewTimeoutRef.current = null;
        }
        previewRequestRef.current = null;
    }, []);

    const requestPreview = useCallback((id) => {
        setPreview({ id, image: null, status: 'loading' });
        if (typeof window === 'undefined') {
            return;
        }

        cancelPreviewRequest();

        const requestId = `${id}-${Date.now()}`;
        previewRequestRef.current = requestId;

        const handleResponse = (event) => {
            const detail = event?.detail || {};
            if (detail.requestId !== requestId || detail.id !== id) {
                return;
            }
            if (previewHandlerRef.current) {
                window.removeEventListener(PREVIEW_RESPONSE_EVENT, previewHandlerRef.current);
            }
            previewHandlerRef.current = null;
            if (previewTimeoutRef.current) {
                clearTimeout(previewTimeoutRef.current);
                previewTimeoutRef.current = null;
            }
            setPreview({
                id,
                image: detail.image || null,
                status: detail.status || (detail.image ? 'ok' : 'unavailable'),
            });
        };

        previewHandlerRef.current = handleResponse;
        window.addEventListener(PREVIEW_RESPONSE_EVENT, handleResponse);

        previewTimeoutRef.current = window.setTimeout(() => {
            if (previewRequestRef.current === requestId) {
                if (previewHandlerRef.current) {
                    window.removeEventListener(PREVIEW_RESPONSE_EVENT, previewHandlerRef.current);
                    previewHandlerRef.current = null;
                }
                setPreview({ id, image: null, status: 'unavailable' });
            }
        }, 600);

        window.dispatchEvent(new CustomEvent(PREVIEW_REQUEST_EVENT, { detail: { id, requestId } }));
    }, [cancelPreviewRequest]);

    const resetPreview = useCallback((id) => {
        setPreview((prev) => (prev.id === id ? { id: null, image: null, status: 'idle' } : prev));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        const handleState = (event) => {
            const detail = event?.detail;
            if (!detail || !detail.id) {
                return;
            }
            setWindowStates((prev) => ({ ...prev, [detail.id]: detail }));
        };
        window.addEventListener(WINDOW_STATE_EVENT, handleState);
        return () => {
            window.removeEventListener(WINDOW_STATE_EVENT, handleState);
        };
    }, []);

    useEffect(() => () => {
        cancelPreviewRequest();
    }, [cancelPreviewRequest]);

    const handleLauncher = useCallback(() => {
        if (typeof props.showAllApps === 'function') {
            props.showAllApps();
        }
    }, [props.showAllApps]);

    const handleLaunchApp = useCallback((appId) => {
        if (typeof props.openApp === 'function') {
            props.openApp(appId);
        }
    }, [props.openApp]);

    const handleClick = useCallback((app) => {
        const id = app.id;
        if (props.minimized_windows[id]) {
            props.openApp(id);
        } else if (props.focused_windows[id]) {
            props.minimize(id);
        } else {
            props.openApp(id);
        }
    }, [props.focused_windows, props.minimized_windows, props.minimize, props.openApp]);

    return (
        <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 backdrop-blur-sm text-white z-40" role="toolbar">
            <div className="flex h-12 items-center px-3 space-x-3">
                <div className="flex items-center space-x-2 min-w-[4.5rem]">
                    <LauncherButton onClick={handleLauncher} />
                    {pinnedApps.map((app) => {
                        const isRunning = props.closed_windows[app.id] === false;
                        return (
                            <button
                                key={`pinned-${app.id}`}
                                type="button"
                                aria-label={`${app.title}${isRunning ? ' (Running)' : ''}`}
                                data-app-id={app.id}
                                className={`relative flex h-9 w-9 items-center justify-center rounded-md border border-white border-opacity-5 transition-colors hover:bg-white hover:bg-opacity-10 ${isRunning ? 'bg-white bg-opacity-10' : 'bg-white bg-opacity-0'}`}
                                onClick={() => handleLaunchApp(app.id)}
                            >
                                <Image
                                    width={24}
                                    height={24}
                                    className="h-5 w-5"
                                    src={app.icon.replace('./', '/')}
                                    alt=""
                                    sizes="24px"
                                />
                                {isRunning && (
                                    <span className="absolute bottom-1 left-1/2 h-1 w-1 rounded-full bg-ub-orange" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-1 items-center overflow-x-auto">
                    {runningApps.length === 0 && (
                        <span className="text-xs text-white text-opacity-60">No windows open</span>
                    )}
                    {runningApps.map((app) => {
                        const isMinimized = props.minimized_windows[app.id];
                        const isFocused = props.focused_windows[app.id] && !isMinimized;
                        const state = windowStates[app.id] || {};
                        const previewForApp = hoveredApp === app.id
                            ? (preview.id === app.id ? preview : { id: app.id, image: null, status: 'loading' })
                            : null;
                        return (
                            <div key={app.id} className="relative mx-1 flex-shrink-0">
                                <button
                                    type="button"
                                    aria-label={`${app.title}${isMinimized ? ' (Minimized)' : ''}`}
                                    aria-pressed={isFocused}
                                    data-context="taskbar"
                                    data-app-id={app.id}
                                    onClick={() => handleClick(app)}
                                    onMouseEnter={() => {
                                        setHoveredApp(app.id);
                                        requestPreview(app.id);
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredApp((current) => (current === app.id ? null : current));
                                        cancelPreviewRequest();
                                        resetPreview(app.id);
                                    }}
                                    className={`${isFocused ? 'bg-white bg-opacity-20' : 'bg-white bg-opacity-0 hover:bg-white hover:bg-opacity-10'} relative flex items-center rounded-md px-3 py-1 transition-colors`}
                                >
                                    <Image
                                        width={24}
                                        height={24}
                                        className="h-5 w-5"
                                        src={app.icon.replace('./', '/')}
                                        alt=""
                                        sizes="24px"
                                    />
                                    <span className="ml-2 text-sm whitespace-nowrap">{app.title}</span>
                                    {!isFocused && !isMinimized && (
                                        <span className="absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-white" />
                                    )}
                                    {state.minimized && (
                                        <span className="sr-only">Minimized</span>
                                    )}
                                </button>
                                {previewForApp && (
                                    <WindowPreview
                                        appTitle={app.title}
                                        preview={previewForApp}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center space-x-3">
                    <PanelClock />
                    <NetworkTrayIcon />
                    <VolumeTrayIcon />
                    <BatteryTrayIcon />
                </div>
            </div>
        </div>
    );
}

const LauncherButton = memo(function LauncherButton({ onClick }) {
    return (
        <button
            type="button"
            aria-label="Open launcher"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white border-opacity-10 bg-white bg-opacity-10 text-sm font-semibold uppercase tracking-wide hover:bg-opacity-20"
            onClick={onClick}
        >
            Kali
        </button>
    );
});

const PanelClock = memo(function PanelClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const tick = () => setNow(new Date());
        const interval = window.setInterval(tick, 30000);
        return () => window.clearInterval(interval);
    }, []);

    return (
        <span className="text-xs font-medium text-white whitespace-nowrap">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    );
});

function WindowPreview({ appTitle, preview }) {
    const { status, image } = preview;
    return (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2">
            <div className="rounded-lg border border-white border-opacity-10 bg-black bg-opacity-90 p-2 shadow-lg">
                {status === 'loading' && (
                    <span className="block text-center text-xs text-white text-opacity-70">Loading preview…</span>
                )}
                {status !== 'loading' && image && (
                    <img
                        src={image}
                        alt={`${appTitle} window preview`}
                        className="h-28 w-full rounded object-cover"
                    />
                )}
                {status !== 'loading' && !image && (
                    <span className="block text-center text-xs text-white text-opacity-70">Preview unavailable</span>
                )}
            </div>
        </div>
    );
}
