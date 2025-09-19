import React from 'react';
import Image from 'next/image';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const displayId = props.activeDisplay || 'display-1';
    const displayName = props.displayName || 'Primary Display';

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
            className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40"
            role="toolbar"
            aria-label={`Taskbar for ${displayName}`}
            data-display-id={displayId}
        >
            <div className="flex items-center h-full px-3 border-r border-white border-opacity-10 text-xs uppercase tracking-wide text-white text-opacity-80">
                <span className="sr-only">Active display</span>
                <span aria-hidden="true">{displayName}</span>
            </div>
            <div className="flex-1 flex items-center overflow-x-auto">
                {runningApps.map(app => (
                    <button
                        key={app.id}
                        type="button"
                        aria-label={app.title}
                        data-context="taskbar"
                        data-app-id={app.id}
                        onClick={() => handleClick(app)}
                        className={(props.focused_windows[app.id] && !props.minimized_windows[app.id] ? ' bg-white bg-opacity-20 ' : ' ') +
                            'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10'}
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
                        {!props.focused_windows[app.id] && !props.minimized_windows[app.id] && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
