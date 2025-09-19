import React from 'react';
import Image from 'next/image';
import { useSettings } from '../../hooks/useSettings';

export default function Taskbar(props) {
    const { taskbarAlignment, taskbarCompact } = useSettings();
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
            className="taskbar"
            role="toolbar"
            aria-label="Running applications"
            data-alignment={taskbarAlignment}
            data-compact={taskbarCompact}
        >
            {runningApps.map((app) => {
                const id = app.id;
                const isFocused = Boolean(props.focused_windows[id] && !props.minimized_windows[id]);
                const isMinimized = Boolean(props.minimized_windows[id]);
                const isActive = isFocused && !isMinimized;
                return (
                    <button
                        key={id}
                        type="button"
                        aria-label={app.title}
                        aria-pressed={isActive}
                        title={app.title}
                        data-context="taskbar"
                        data-app-id={id}
                        onClick={() => handleClick(app)}
                        className={`taskbar__item${isActive ? ' taskbar__item--active' : ''}`}
                    >
                        <Image
                            width={24}
                            height={24}
                            className="taskbar__icon"
                            src={app.icon.replace('./', '/')}
                            alt=""
                            sizes="24px"
                        />
                        <span className="taskbar__label">{app.title}</span>
                        {!isActive && !isMinimized && (
                            <span className="taskbar__indicator" aria-hidden="true" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
