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

                    const accentActiveClass = isFocused && isActive ? 'bg-[color:color-mix(in_srgb,var(--kali-accent)_35%,transparent)] ' : '';

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
                            className={`${accentActiveClass}relative flex items-center mx-1 px-2 py-1 rounded transition-colors hover:bg-[color:color-mix(in_srgb,var(--kali-accent)_25%,transparent)] focus-visible:bg-[color:color-mix(in_srgb,var(--kali-accent)_25%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-accent)] focus-visible:ring-offset-1`}
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
                                    className="pointer-events-none absolute bottom-0 left-1/2 w-0 h-0"
                                    style={{
                                        borderLeft: '4px solid transparent',
                                        borderRight: '4px solid transparent',
                                        borderTop: '4px solid var(--kali-accent)',
                                        transform: 'translateX(-50%) translateY(50%)',
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
