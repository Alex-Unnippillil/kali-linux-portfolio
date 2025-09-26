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

    const runningApps = apps.filter((app) => closed_windows[app.id] === false);

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
            className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center justify-between px-2 z-40"
            role="toolbar"
            aria-label="Desktop dock"
        >
            <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                onSelect={onSelectWorkspace}
            />
            <div
                className="flex items-center overflow-x-auto"
                role="tablist"
                aria-label="Running applications"
            >
                {runningApps.map((app) => {
                    const isMinimized = Boolean(minimized_windows[app.id]);
                    const isFocused = Boolean(focused_windows[app.id]);
                    const isActive = !isMinimized;
                    const isSelected = isFocused && isActive;

                    return (
                        <button
                            key={app.id}
                            id={`dock-tab-${app.id}`}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            aria-pressed={isActive}
                            aria-label={app.title}
                            data-context="taskbar"
                            data-app-id={app.id}
                            data-active={isActive ? 'true' : 'false'}
                            aria-controls={app.id}
                            onClick={() => handleClick(app)}
                            className={`${
                                isSelected ? 'bg-white bg-opacity-20 ' : ''
                            }relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-black`}
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
                            {isActive && !isFocused && (
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
    );
}
