'use client';

import React from 'react';
import Image from 'next/image';

type DesktopApp = {
    id: string;
    title: string;
    icon: string;
};

type WindowStateMap = Record<string, boolean | undefined>;

type TaskbarProps = {
    apps: DesktopApp[];
    closed_windows: WindowStateMap;
    minimized_windows: WindowStateMap;
    focused_windows: WindowStateMap;
    openApp: (id: string) => void;
    minimize: (id: string) => void;
};

const getStateLabel = (isMinimized: boolean, isActive: boolean) => {
    if (isMinimized) {
        return 'Minimized window';
    }

    if (isActive) {
        return 'Active window';
    }

    return 'Running in background';
};

function Taskbar({
    apps,
    closed_windows,
    minimized_windows,
    focused_windows,
    openApp,
    minimize,
}: TaskbarProps) {
    const runningApps = React.useMemo(
        () => apps.filter(app => closed_windows[app.id] === false),
        [apps, closed_windows],
    );

    const handleClick = React.useCallback(
        (app: DesktopApp) => {
            const id = app.id;

            if (minimized_windows[id]) {
                openApp(id);
                return;
            }

            if (focused_windows[id]) {
                minimize(id);
                return;
            }

            openApp(id);
        },
        [focused_windows, minimized_windows, minimize, openApp],
    );

    return (
        <div
            className="absolute bottom-0 left-0 z-40 flex h-10 w-full flex-row items-center bg-black bg-opacity-50"
            role="toolbar"
            aria-label="Running applications taskbar"
            aria-orientation="horizontal"
        >
            {runningApps.map(app => {
                const isMinimized = Boolean(minimized_windows[app.id]);
                const isActive = Boolean(focused_windows[app.id]) && !isMinimized;
                const stateLabel = getStateLabel(isMinimized, isActive);
                const accessibleLabel = `${app.title} — ${stateLabel}`;
                const showBackgroundMarker = !isActive && !isMinimized;

                return (
                    <button
                        key={app.id}
                        type="button"
                        aria-label={accessibleLabel}
                        aria-pressed={isActive}
                        title={accessibleLabel}
                        data-context="taskbar"
                        data-app-id={app.id}
                        onClick={() => handleClick(app)}
                        className={`relative mx-1 flex items-center rounded px-2 py-1 text-white transition hover:bg-white hover:bg-opacity-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white${
                            isActive ? ' bg-white bg-opacity-20' : ''
                        }`}
                    >
                        <Image
                            width={24}
                            height={24}
                            className="h-5 w-5 flex-shrink-0"
                            src={app.icon.replace('./', '/')}
                            alt=""
                            aria-hidden="true"
                            sizes="24px"
                        />
                        <span className="ml-1 whitespace-nowrap text-sm">{app.title}</span>
                        <span className="sr-only">{`, ${stateLabel}`}</span>
                        {showBackgroundMarker && (
                            <span
                                className="pointer-events-none absolute bottom-0 left-1/2 h-0.5 w-2 -translate-x-1/2 rounded bg-white"
                                aria-hidden="true"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default Taskbar;
