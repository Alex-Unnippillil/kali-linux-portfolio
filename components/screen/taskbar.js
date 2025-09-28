import React from 'react';
import Image from 'next/image';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const workspaces = props.workspaces || [];

    const handleClick = (app) => {
        const id = app.id;
        const isMinimized = Boolean(props.minimized_windows[id]);
        const isFocused = Boolean(props.focused_windows[id]);
        const isOpen = props.closed_windows[id] === false;

        if (isMinimized) {
            props.openApp(id);
            return;
        }

        if (isFocused) {
            props.minimize(id);
            return;
        }

        if (isOpen && typeof props.focusWindow === 'function') {
            props.focusWindow(id);
            return;
        }

        props.openApp(id);
    };

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center justify-between px-2 z-40" role="toolbar">
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
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-6 rounded-full bg-[var(--kali-blue)] shadow-[0_0_6px_rgba(23,147,209,0.6)]"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
