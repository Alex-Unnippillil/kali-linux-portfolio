import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { useSettings } from '../../hooks/useSettings';

const HIDE_DELAY_MS = 180;

export default function Taskbar(props) {
    const { panelAutohide, reducedMotion } = useSettings();
    const runningApps = useMemo(
        () => props.apps.filter((app) => props.closed_windows[app.id] === false),
        [props.apps, props.closed_windows]
    );
    const workspaces = props.workspaces || [];
    const panelRef = useRef(null);
    const hideTimeoutRef = useRef(null);
    const [fullscreenWindows, setFullscreenWindows] = useState(() => new Set());
    const [bottomCollisions, setBottomCollisions] = useState(() => new Set());
    const [documentFullscreen, setDocumentFullscreen] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);

    const clearHideTimeout = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    }, []);

    const scheduleHide = useCallback(() => {
        if (!panelAutohide) return;
        clearHideTimeout();
        hideTimeoutRef.current = setTimeout(() => {
            setIsInteracting(false);
            hideTimeoutRef.current = null;
        }, HIDE_DELAY_MS);
    }, [clearHideTimeout, panelAutohide]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleFullscreen = (event) => {
            const detail = event?.detail || {};
            if (!detail.id) return;
            setFullscreenWindows((prev) => {
                const next = new Set(prev);
                if (detail.fullscreen) {
                    next.add(detail.id);
                } else {
                    next.delete(detail.id);
                }
                return next;
            });
        };
        const handleEdgeCollision = (event) => {
            const detail = event?.detail || {};
            if (!detail.id || detail.edge !== 'bottom') return;
            setBottomCollisions((prev) => {
                const next = new Set(prev);
                if (detail.collided) {
                    next.add(detail.id);
                } else {
                    next.delete(detail.id);
                }
                return next;
            });
        };
        window.addEventListener('desktop:window-fullscreen', handleFullscreen);
        window.addEventListener('desktop:edge-collision', handleEdgeCollision);
        return () => {
            window.removeEventListener('desktop:window-fullscreen', handleFullscreen);
            window.removeEventListener('desktop:edge-collision', handleEdgeCollision);
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const updateState = () => {
            setDocumentFullscreen(Boolean(document.fullscreenElement));
        };
        updateState();
        document.addEventListener('fullscreenchange', updateState);
        return () => {
            document.removeEventListener('fullscreenchange', updateState);
        };
    }, []);

    useEffect(() => {
        if (!panelAutohide) {
            clearHideTimeout();
            setIsInteracting(false);
        }
    }, [panelAutohide, clearHideTimeout]);

    useEffect(() => {
        return () => clearHideTimeout();
    }, [clearHideTimeout]);

    const shouldAutoHide = panelAutohide && (documentFullscreen || fullscreenWindows.size > 0 || bottomCollisions.size > 0);
    const hidden = shouldAutoHide && !isInteracting;

    const handleClick = (app) => {
        const id = app.id;
        if (props.minimized_windows[id]) {
            props.openApp(id);
        } else if (props.focused_windows[id]) {
            props.minimize(id);
        } else {
            props.openApp(id);
        }
    };

    const handleFocusCapture = () => {
        if (!shouldAutoHide) return;
        clearHideTimeout();
        setIsInteracting(true);
    };

    const handleBlurCapture = (event) => {
        if (!shouldAutoHide) return;
        const nextTarget = event?.relatedTarget;
        if (panelRef.current && nextTarget && panelRef.current.contains(nextTarget)) {
            return;
        }
        scheduleHide();
    };

    const handleMouseEnter = () => {
        if (!shouldAutoHide) return;
        clearHideTimeout();
        setIsInteracting(true);
    };

    const handleMouseLeave = () => {
        if (!shouldAutoHide) return;
        scheduleHide();
    };

    const handleRevealEnter = () => {
        if (!shouldAutoHide) return;
        clearHideTimeout();
        setIsInteracting(true);
    };

    return (
        <>
            {panelAutohide && (
                <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 w-full h-2 z-30"
                    onMouseEnter={handleRevealEnter}
                />
            )}
            <div
                ref={panelRef}
                className={`absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center justify-between px-2 z-40 ${hidden ? 'translate-y-full pointer-events-none' : 'translate-y-0'} ${reducedMotion ? '' : 'transition-transform duration-200'}`}
                role="toolbar"
                data-autohide={panelAutohide ? 'true' : 'false'}
                onFocusCapture={handleFocusCapture}
                onBlurCapture={handleBlurCapture}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <WorkspaceSwitcher
                    workspaces={workspaces}
                    activeWorkspace={props.activeWorkspace}
                    onSelect={props.onSelectWorkspace}
                />
                <div className="flex items-center overflow-x-auto">
                    {runningApps.map(app => {
                        const isMinimized = Boolean(props.minimized_windows[app.id]);
                        const isFocused = Boolean(props.focused_windows[app.id]);
                        const isActive = !isMinimized;

                        return (
                            <button
                                key={app.id}
                                type="button"
                                aria-label={app.title}
                                data-context="taskbar"
                                data-app-id={app.id}
                                data-active={isActive ? 'true' : 'false'}
                                aria-pressed={isActive}
                                onClick={() => handleClick(app)}
                                className={`${isFocused && isActive ? 'bg-white bg-opacity-20 ' : ''}relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10`}
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
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
