import React from 'react';
import Image from 'next/image';

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
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
            {runningApps.map(app => {
                const isMinimized = props.minimized_windows[app.id];
                const isActive = props.focused_windows[app.id] && !isMinimized;
                const buttonClasses = [
                    'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10',
                    isActive ? 'bg-white bg-opacity-20' : '',
                ].filter(Boolean).join(' ');

                return (
                    <button
                        key={app.id}
                        type="button"
                        aria-label={app.title}
                        aria-current={isActive ? 'true' : undefined}
                        data-context="taskbar"
                        data-app-id={app.id}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => handleClick(app)}
                        className={buttonClasses}
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
                        {!isMinimized && (
                            <span
                                aria-hidden="true"
                                data-indicator="window-state"
                                data-active={isActive ? 'true' : 'false'}
                                className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded transition-all ${isActive ? 'w-3 h-1 bg-white opacity-100' : 'w-2 h-0.5 bg-white opacity-70'}`}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
