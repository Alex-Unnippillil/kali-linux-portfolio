import React from 'react';
import Image from 'next/image';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';

export default function Taskbar(props) {
    const {
        apps,
        closed_windows,
        minimized_windows,
        focused_windows,
        openApp,
        minimize,
        workspaces = [],
        activeWorkspace,
        onSelectWorkspace,
    } = props;

    const runningApps = Array.isArray(apps)
        ? apps.filter((app) => closed_windows[app.id] === false)
        : [];

    const handleClick = (app) => {
        const id = app.id;
        if (minimized_windows[id]) {
            openApp(id);
        } else if (focused_windows[id]) {
            minimize(id);
        } else {
            openApp(id);
        }
    };

    return (
        <div
            className="taskbar-panel absolute bottom-0 left-0 right-0 z-40 flex h-12 items-center justify-between px-3"
            role="toolbar"
            aria-label="Running applications"
        >
            <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                onSelect={onSelectWorkspace}
            />
            <div className="flex items-center gap-1 overflow-x-auto pl-3">
                {runningApps.length === 0 ? (
                    <span className="px-3 text-xs text-ubt-grey/70">No apps running</span>
                ) : (
                    runningApps.map((app) => {
                        const isMinimized = Boolean(minimized_windows[app.id]);
                        const isFocused = Boolean(focused_windows[app.id]);
                        const isActive = !isMinimized;
                        const buttonClasses = [
                            'taskbar-launcher',
                            isFocused && isActive ? 'ring-1 ring-ubb-orange/60' : '',
                        ]
                            .filter(Boolean)
                            .join(' ');

                        return (
                            <button
                                key={app.id}
                                type="button"
                                aria-label={app.title}
                                aria-pressed={isActive}
                                data-context="taskbar"
                                data-app-id={app.id}
                                data-active={isActive ? 'true' : 'false'}
                                data-minimized={isMinimized ? 'true' : 'false'}
                                onClick={() => handleClick(app)}
                                className={buttonClasses}
                                title={isMinimized ? `${app.title} (click to restore)` : app.title}
                            >
                                <Image
                                    width={24}
                                    height={24}
                                    className="h-5 w-5 drop-shadow-[0_0_10px_rgba(23,147,209,0.4)]"
                                    src={app.icon.replace('./', '/')}
                                    alt=""
                                    sizes="24px"
                                />
                                <span className="hidden whitespace-nowrap text-sm font-medium text-white/90 sm:inline">
                                    {app.title}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
