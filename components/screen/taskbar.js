import React from 'react';
import Image from 'next/image';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import NotificationBell from '../ui/NotificationBell';
import Status from '../util-components/status';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const workspaces = props.workspaces || [];

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

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center justify-between gap-2 px-2 z-40" role="toolbar">
            <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspace={props.activeWorkspace}
                onSelect={props.onSelectWorkspace}
            />
            <div className="flex flex-1 items-center justify-center overflow-x-auto px-2">
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
            <div className="glass flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-white">
                <NotificationBell />
                <Status className="hidden sm:flex" />
            </div>
        </div>
    );
}
