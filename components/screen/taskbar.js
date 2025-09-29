import React from 'react';

import SmartImage from '../util-components/SmartImage';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);

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

        <div
            className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 flex items-center justify-start z-40 backdrop-blur-sm"
            role="toolbar"
            style={{
                height: 'var(--shell-taskbar-height, 2.5rem)',
                paddingInline: 'var(--shell-taskbar-padding-x, 0.75rem)',
            }}
        >
            <div
                className="flex items-center overflow-x-auto"
                style={{ gap: 'var(--shell-taskbar-gap, 0.5rem)' }}
            >
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
                            className={`${isFocused && isActive ? 'bg-white bg-opacity-20 ' : ''}relative flex items-center justify-center rounded-lg transition-colors hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                            style={{
                                minHeight: 'var(--shell-hit-target, 2.5rem)',
                                minWidth: 'var(--shell-hit-target, 2.5rem)',
                                paddingInline: 'calc(var(--shell-taskbar-padding-x, 0.75rem) * 0.75)',
                                fontSize: 'var(--shell-taskbar-font-size, 0.875rem)',
                                gap: '0.5rem',
                            }}
                        >
                            <SmartImage
                                width={32}
                                height={32}
                                style={{
                                    width: 'var(--shell-taskbar-icon, 1.5rem)',
                                    height: 'var(--shell-taskbar-icon, 1.5rem)',
                                }}
                                src={app.icon.replace('./', '/')}
                                alt=""
                                sizes="(max-width: 768px) 32px, 40px"
                            />
                            <span
                                className="text-white whitespace-nowrap"
                                style={{ fontSize: 'var(--shell-taskbar-font-size, 0.875rem)' }}
                            >
                                {app.title}
                            </span>
                            {isActive && (
                                <span
                                    aria-hidden="true"
                                    data-testid="running-indicator"
                                    className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded"
                                    style={{
                                        width: '0.5rem',
                                        height: '0.25rem',
                                        background: 'currentColor',
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
