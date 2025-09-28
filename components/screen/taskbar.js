import React from 'react';
import Image from 'next/image';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';

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
        <div className="absolute bottom-0 left-0 w-full h-10 border-t border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/95 text-[var(--kali-text)] flex items-center justify-between px-2 z-40 backdrop-blur-md" role="toolbar">
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
                            className={`${isFocused && isActive ? 'bg-[var(--kali-panel-highlight)] ' : ''}relative flex items-center mx-1 px-2 py-1 rounded-md transition focus-visible:ring-2 focus-visible:ring-[var(--kali-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] hover:bg-[var(--kali-panel-highlight)]`}
                        >
                            <Image
                                width={24}
                                height={24}
                                className="w-5 h-5"
                                src={app.icon.replace('./', '/')}
                                alt=""
                                sizes="24px"
                            />
                            <span className="ml-1 text-sm text-[var(--kali-text)] whitespace-nowrap">{app.title}</span>
                            {isActive && (
                                <span
                                    aria-hidden="true"
                                    data-testid="running-indicator"
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 rounded bg-[var(--kali-blue)]"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
