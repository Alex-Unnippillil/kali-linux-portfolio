'use client';

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Image from 'next/image';
import TaskbarPreview from '../desktop/TaskbarPreview';

export default function Taskbar(props) {
    const {
        apps,
        closed_windows,
        minimized_windows,
        focused_windows,
        openApp,
        minimize,
        closeApp,
    } = props;

    const runningApps = useMemo(
        () => apps.filter(app => closed_windows[app.id] === false),
        [apps, closed_windows]
    );

    const [activePreview, setActivePreview] = useState(null);
    const [anchorRect, setAnchorRect] = useState(null);
    const buttonRefs = useRef({});
    const closeTimeoutRef = useRef(null);
    const previewNodeRef = useRef(null);
    const pointerInsidePreviewRef = useRef(false);
    const focusInsidePreviewRef = useRef(false);
    const triggerRef = useRef(null);
    const lastActiveRef = useRef(null);

    const clearCloseTimeout = useCallback(() => {
        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    }, []);

    const measureAnchor = useCallback((id) => {
        if (!id) return null;
        const button = buttonRefs.current[id];
        if (!button) return null;
        return button.getBoundingClientRect();
    }, []);

    const updateAnchorForActive = useCallback(() => {
        if (!activePreview) return;
        const rect = measureAnchor(activePreview);
        if (rect) {
            setAnchorRect(rect);
        }
    }, [activePreview, measureAnchor]);

    useEffect(() => {
        if (!activePreview) return undefined;
        updateAnchorForActive();
        window.addEventListener('resize', updateAnchorForActive);
        window.addEventListener('scroll', updateAnchorForActive, true);
        return () => {
            window.removeEventListener('resize', updateAnchorForActive);
            window.removeEventListener('scroll', updateAnchorForActive, true);
        };
    }, [activePreview, updateAnchorForActive]);

    const scheduleDismiss = useCallback((delay = 150) => {
        clearCloseTimeout();
        closeTimeoutRef.current = window.setTimeout(() => {
            if (pointerInsidePreviewRef.current || focusInsidePreviewRef.current) {
                return;
            }
            setActivePreview(null);
            setAnchorRect(null);
        }, delay);
    }, [clearCloseTimeout]);

    const handleDismiss = useCallback(() => {
        clearCloseTimeout();
        pointerInsidePreviewRef.current = false;
        focusInsidePreviewRef.current = false;
        setActivePreview(null);
        setAnchorRect(null);
    }, [clearCloseTimeout]);

    useEffect(() => clearCloseTimeout, [clearCloseTimeout]);

    useEffect(() => {
        if (activePreview) {
            lastActiveRef.current = activePreview;
            return;
        }
        const lastId = lastActiveRef.current;
        if (lastId && triggerRef.current === 'keyboard') {
            const button = buttonRefs.current[lastId];
            if (button && typeof button.focus === 'function') {
                button.focus();
            }
        }
        triggerRef.current = null;
        lastActiveRef.current = null;
    }, [activePreview]);

    const openPreview = useCallback((id, trigger) => {
        if (!id) return;
        triggerRef.current = trigger;
        pointerInsidePreviewRef.current = false;
        focusInsidePreviewRef.current = false;
        setActivePreview(id);
        const rect = measureAnchor(id);
        if (rect) {
            setAnchorRect(rect);
        }
        clearCloseTimeout();
    }, [measureAnchor, clearCloseTimeout]);

    const handleButtonClick = useCallback((app) => {
        const id = app.id;
        if (minimized_windows[id]) {
            openApp(id);
        } else if (focused_windows[id]) {
            minimize(id);
        } else {
            openApp(id);
        }
        handleDismiss();
    }, [focused_windows, minimized_windows, minimize, openApp, handleDismiss]);

    const handleButtonMouseLeave = useCallback(() => {
        scheduleDismiss();
    }, [scheduleDismiss]);

    const handleButtonBlur = useCallback((event) => {
        const next = event.relatedTarget;
        const node = previewNodeRef.current;
        if (node && next && node.contains(next)) {
            return;
        }
        scheduleDismiss();
    }, [scheduleDismiss]);

    const handlePreviewPointerChange = useCallback((inside) => {
        pointerInsidePreviewRef.current = inside;
        if (inside) {
            clearCloseTimeout();
        } else {
            scheduleDismiss();
        }
    }, [clearCloseTimeout, scheduleDismiss]);

    const handlePreviewFocusChange = useCallback((inside) => {
        focusInsidePreviewRef.current = inside;
        if (inside) {
            clearCloseTimeout();
        } else {
            scheduleDismiss();
        }
    }, [clearCloseTimeout, scheduleDismiss]);

    return (
        <div className="absolute bottom-0 left-0 flex h-10 w-full items-center bg-black bg-opacity-50 z-40" role="toolbar">
            {runningApps.map(app => {
                const id = app.id;
                const isFocused = focused_windows[id] && !minimized_windows[id];
                const isMinimized = !!minimized_windows[id];
                const isPreviewOpen = activePreview === id;

                return (
                    <div key={id} className="relative">
                        <button
                            ref={node => {
                                if (node) {
                                    buttonRefs.current[id] = node;
                                } else {
                                    delete buttonRefs.current[id];
                                }
                            }}
                            type="button"
                            aria-label={app.title}
                            aria-haspopup="dialog"
                            aria-expanded={isPreviewOpen}
                            aria-controls={isPreviewOpen ? `${id}-taskbar-preview` : undefined}
                            data-context="taskbar"
                            data-app-id={id}
                            onClick={() => handleButtonClick(app)}
                            onMouseEnter={() => openPreview(id, 'pointer')}
                            onFocus={() => openPreview(id, 'keyboard')}
                            onMouseLeave={handleButtonMouseLeave}
                            onBlur={handleButtonBlur}
                            className={(isFocused ? ' bg-white bg-opacity-20 ' : ' ') +
                                'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'}
                        >
                            <Image
                                width={24}
                                height={24}
                                className="h-5 w-5"
                                src={app.icon.replace('./', '/')}
                                alt=""
                                sizes="24px"
                            />
                            <span className="ml-1 whitespace-nowrap text-sm text-white">{app.title}</span>
                            {!isFocused && !isMinimized && (
                                <span className="absolute bottom-0 left-1/2 h-0.5 w-2 -translate-x-1/2 rounded bg-white" />
                            )}
                        </button>
                        {isPreviewOpen ? (
                            <TaskbarPreview
                                ref={previewNodeRef}
                                appId={id}
                                title={app.title}
                                iconSrc={app.icon}
                                anchorRect={anchorRect}
                                minimized={isMinimized}
                                onCloseApp={() => closeApp(id)}
                                onDismiss={handleDismiss}
                                onPointerStateChange={handlePreviewPointerChange}
                                onFocusWithinChange={handlePreviewFocusChange}
                            />
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
