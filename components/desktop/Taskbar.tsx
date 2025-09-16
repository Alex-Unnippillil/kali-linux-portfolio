import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

const IDLE_HIDE_DELAY = 1200;
const EDGE_ACTIVATION_ZONE_PX = 8;

type DesktopApp = {
    id: string;
    title: string;
    icon: string;
    [key: string]: unknown;
};

interface TaskbarProps {
    apps: DesktopApp[];
    closed_windows: Record<string, boolean>;
    minimized_windows: Record<string, boolean>;
    focused_windows: Record<string, boolean>;
    openApp: (id: string) => void;
    minimize: (id: string) => void;
}

const Taskbar: React.FC<TaskbarProps> = ({
    apps,
    closed_windows,
    minimized_windows,
    focused_windows,
    openApp,
    minimize,
}) => {
    const [isHidden, setIsHidden] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const idleTimerRef = useRef<number | null>(null);
    const isHiddenRef = useRef(false);
    const focusWithinRef = useRef(false);

    const runningApps = useMemo(
        () => apps.filter(app => closed_windows[app.id] === false),
        [apps, closed_windows],
    );

    const clearIdleTimer = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (idleTimerRef.current !== null) {
            window.clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }, []);

    const hideTaskbar = useCallback(() => {
        if (focusWithinRef.current) {
            return;
        }

        isHiddenRef.current = true;
        setIsHidden(true);
    }, []);

    const showTaskbar = useCallback(() => {
        isHiddenRef.current = false;
        setIsHidden(false);
        clearIdleTimer();
    }, [clearIdleTimer]);

    const scheduleHide = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (focusWithinRef.current) {
            return;
        }

        clearIdleTimer();
        idleTimerRef.current = window.setTimeout(() => {
            if (!focusWithinRef.current) {
                hideTaskbar();
            }
        }, IDLE_HIDE_DELAY);
    }, [clearIdleTimer, hideTaskbar]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return undefined;
        }

        const handlePointerMove = (event: PointerEvent) => {
            const nearEdge = event.clientY >= window.innerHeight - EDGE_ACTIVATION_ZONE_PX;

            if (nearEdge) {
                showTaskbar();
            }

            if (!isHiddenRef.current || nearEdge) {
                scheduleHide();
            }
        };

        const handlePointerDown = () => {
            if (!isHiddenRef.current) {
                scheduleHide();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Meta' || event.metaKey) {
                showTaskbar();
                scheduleHide();
            } else if (!isHiddenRef.current) {
                scheduleHide();
            }
        };

        const handleFocusIn = (event: FocusEvent) => {
            const root = rootRef.current;
            const isInside = root?.contains(event.target as Node) ?? false;

            focusWithinRef.current = isInside;

            if (isInside) {
                showTaskbar();
            } else if (!isHiddenRef.current) {
                scheduleHide();
            }
        };

        const handleFocusOut = (event: FocusEvent) => {
            const root = rootRef.current;
            const related = event.relatedTarget as Node | null;
            const stillInside = related ? root?.contains(related) ?? false : false;

            focusWithinRef.current = stillInside;

            if (!stillInside && !isHiddenRef.current) {
                scheduleHide();
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);

        scheduleHide();

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
            clearIdleTimer();
        };
    }, [clearIdleTimer, scheduleHide, showTaskbar]);

    const handleClick = useCallback(
        (app: DesktopApp) => {
            const { id } = app;

            if (minimized_windows[id]) {
                openApp(id);
            } else if (focused_windows[id]) {
                minimize(id);
            } else {
                openApp(id);
            }
        },
        [focused_windows, minimized_windows, openApp, minimize],
    );

    return (
        <div
            ref={rootRef}
            role="toolbar"
            aria-hidden={isHidden || undefined}
            data-state={isHidden ? 'hidden' : 'visible'}
            className={
                'absolute bottom-0 left-0 z-40 flex h-10 w-full items-center bg-black bg-opacity-50 ' +
                'transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:duration-0 ' +
                (isHidden ? 'translate-y-full pointer-events-none' : 'translate-y-0')
            }
        >
            {runningApps.map(app => (
                <button
                    key={app.id}
                    type="button"
                    aria-label={app.title}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    className={
                        (focused_windows[app.id] && !minimized_windows[app.id] ? ' bg-white bg-opacity-20 ' : ' ') +
                        'relative mx-1 flex items-center rounded px-2 py-1 text-left text-white transition-colors hover:bg-white hover:bg-opacity-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70'
                    }
                >
                    <Image
                        width={24}
                        height={24}
                        className="h-5 w-5"
                        src={app.icon.replace('./', '/')}
                        alt=""
                        sizes="24px"
                    />
                    <span className="ml-1 whitespace-nowrap text-sm">{app.title}</span>
                    {!focused_windows[app.id] && !minimized_windows[app.id] && (
                        <span className="absolute bottom-0 left-1/2 h-0.5 w-2 -translate-x-1/2 rounded bg-white" />
                    )}
                </button>
            ))}
        </div>
    );
};

export default Taskbar;
